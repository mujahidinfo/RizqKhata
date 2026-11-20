import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@genpos/db';
import type { TenantContext } from '../../common/types.js';
import { generateOrderNumber, recordedAtOrNow, round2 } from '../../common/utils.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  CreateOrderDto,
  CreateRefundDto,
  ListOrdersQueryDto,
  UpdateOrderStatusDto,
} from './orders.dto.js';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    tenant: TenantContext,
    { status, search, from, to, page, pageSize }: ListOrdersQueryDto,
  ) {
    const where: Prisma.OrderWhereInput = {
      shopId: tenant.shopId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { customer: { phone: { contains: search } } },
        ],
      }),
      ...((from || to) && {
        createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          customer: true,
          cashier: { select: { id: true, name: true } },
          items: { include: { product: true } },
          refunds: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        // Newest first; id breaks ties so paging never repeats or skips a sale.
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async getById(tenant: TenantContext, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, shopId: tenant.shopId },
      include: {
        customer: true,
        cashier: { select: { id: true, name: true } },
        items: { include: { product: true, variant: true } },
        refunds: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  /**
   * @param options.depositApplied advance already paid (service jobs); shown on
   *   the receipt and deducted from what's due.
   * @param options.inTransaction runs inside the order's transaction, so e.g.
   *   marking a job delivered commits together with the sale.
   */
  async create(
    tenant: TenantContext,
    input: CreateOrderDto,
    cashierId: string,
    options: {
      depositApplied?: number;
      inTransaction?: (tx: Prisma.TransactionClient, orderId: string) => Promise<void>;
    } = {},
  ) {
    const [shop, products] = await Promise.all([
      this.prisma.shop.findUniqueOrThrow({ where: { id: tenant.shopId } }),
      this.prisma.product.findMany({
        where: {
          businessId: tenant.businessId,
          id: { in: [...new Set(input.items.map((i) => i.productId))] },
        },
        include: { variants: { select: { id: true, isDefault: true } } },
      }),
    ]);
    if (input.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: input.customerId, businessId: tenant.businessId },
      });
      if (!customer) throw new BadRequestException('Unknown customer');
    }
    const allowNegativeStock = shop.allowNegativeStock || input.recordedOffline;

    // Every line sells a concrete variant so stock always moves.
    const lines = input.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product)
        throw new BadRequestException(`Unknown product: ${item.name}`);
      const variantId = item.variantId
        ? product.variants.find((v) => v.id === item.variantId)?.id
        : (
            product.variants.find((v) => v.isDefault) ??
            (product.variants.length === 1 ? product.variants[0] : undefined)
          )?.id;
      if (!variantId) {
        throw new BadRequestException(`Choose a variant for ${item.name}`);
      }
      return { ...item, variantId, isService: product.kind === 'SERVICE' };
    });

    const subtotal = lines.reduce((s, i) => s + i.price * i.quantity, 0);
    let discountAmt = 0;
    if (input.discountType === 'percentage') {
      discountAmt = subtotal * (Math.min(input.discountValue, 100) / 100);
    } else if (input.discountType === 'fixed') {
      discountAmt = input.discountValue;
    }
    // Never let a discount exceed the subtotal — that would book a negative order.
    discountAmt = round2(Math.min(discountAmt, subtotal));
    const taxableAmount = subtotal - discountAmt;
    const taxAmt = round2(taxableAmount * (input.taxRate / 100));
    const total = round2(taxableAmount + taxAmt);

    const createdAt = recordedAtOrNow(input.recordedAt);

    // Stock deduction and order creation succeed or fail together.
    return this.prisma.$transaction(async (tx) => {
      for (const line of lines) {
        // Services aren't stocked: nothing to take off the shelf.
        if (line.isService) continue;
        const key = { shopId: tenant.shopId, variantId: line.variantId };
        if (allowNegativeStock) {
          // Never block a sale at the counter; a negative count flags a recount.
          await tx.inventory.upsert({
            where: { shopId_variantId: key },
            create: { ...key, quantity: -line.quantity },
            update: { quantity: { decrement: line.quantity } },
          });
        } else {
          // Conditional decrement: atomic, so concurrent sales can't oversell.
          const { count } = await tx.inventory.updateMany({
            where: { ...key, quantity: { gte: line.quantity } },
            data: { quantity: { decrement: line.quantity } },
          });
          if (count === 0) {
            throw new BadRequestException(
              `Insufficient stock for ${line.name}`,
            );
          }
        }
        await tx.stockMovement.create({
          data: {
            ...key,
            productId: line.productId,
            type: 'OUT',
            quantity: line.quantity,
            note: input.recordedOffline ? 'Sale (recorded offline)' : 'Sale',
            createdAt,
          },
        });
      }

      const customerId = input.customer
        ? (await this.findOrCreateCustomer(tx, tenant, input.customer)).id
        : input.customerId;
      const order = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          createdAt,
          depositApplied: options.depositApplied ?? 0,
          businessId: tenant.businessId,
          shopId: tenant.shopId,
          cashierId,
          customerId,
          type: input.type,
          status: input.status,
          subtotal,
          discountType: input.discountType,
          discountValue: input.discountValue,
          discountAmt,
          taxRate: input.taxRate,
          taxAmt,
          total,
          paymentMethod: input.paymentMethod,
          amountTendered: input.amountTendered,
          note: input.note,
          items: {
            create: lines.map((i) => ({
              productId: i.productId,
              variantId: i.variantId,
              name: i.name,
              sku: i.sku,
              price: i.price,
              quantity: i.quantity,
              total: i.price * i.quantity,
            })),
          },
        },
        include: {
          customer: true,
          cashier: { select: { id: true, name: true } },
          items: { include: { product: true, variant: true } },
          refunds: true,
        },
      });
      if (options.inTransaction) await options.inTransaction(tx, order.id);
      return order;
    });
  }

  /** Same rule as CustomersService.findOrCreate: one customer per phone per business. */
  private async findOrCreateCustomer(
    tx: Prisma.TransactionClient,
    tenant: TenantContext,
    input: { phone: string; name: string },
  ) {
    const existing = await tx.customer.findFirst({
      where: { businessId: tenant.businessId, phone: input.phone },
    });
    return existing ?? tx.customer.create({ data: { ...input, businessId: tenant.businessId } });
  }

  updateStatus(
    tenant: TenantContext,
    id: string,
    { status }: UpdateOrderStatusDto,
  ) {
    return this.prisma.order.update({
      where: { id, shopId: tenant.shopId },
      data: { status },
    });
  }

  /**
   * Give money back, and optionally put returned units back on the shelf of
   * the branch that sold them, in one transaction. Each unit can come back
   * once (OrderItem.returnedQty); services are never stocked.
   */
  refund(tenant: TenantContext, orderId: string, input: CreateRefundDto) {
    const { items: returns = [], ...money } = input;
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, shopId: tenant.shopId },
        include: { items: { include: { product: { select: { kind: true } } } } },
      });
      if (!order) throw new NotFoundException('Order not found');
      const existing = await tx.refund.aggregate({
        where: { orderId },
        _sum: { amount: true },
      });
      const totalRefunded = existing._sum.amount ?? 0;
      if (round2(totalRefunded + money.amount) > round2(order.total)) {
        throw new BadRequestException('Refund exceeds order total');
      }

      // Merge repeated lines so a duplicated id can't slip past the cap.
      const wanted = new Map<string, number>();
      for (const r of returns) wanted.set(r.orderItemId, (wanted.get(r.orderItemId) ?? 0) + r.quantity);

      for (const [orderItemId, quantity] of wanted) {
        const line = order.items.find((i) => i.id === orderItemId);
        if (!line) throw new BadRequestException('That item is not on this order');
        if (line.product.kind === 'SERVICE' || !line.variantId) {
          throw new BadRequestException(`${line.name} is a service and has no stock to return`);
        }
        // Conditional increment: atomic, so two refunds can't return the same unit twice.
        const { count } = await tx.orderItem.updateMany({
          where: { id: line.id, returnedQty: { lte: line.quantity - quantity } },
          data: { returnedQty: { increment: quantity } },
        });
        if (count === 0) {
          throw new BadRequestException(`Only ${line.quantity - line.returnedQty} of ${line.name} can still be returned`);
        }
        const key = { shopId: tenant.shopId, variantId: line.variantId };
        await tx.inventory.upsert({
          where: { shopId_variantId: key },
          create: { ...key, quantity },
          update: { quantity: { increment: quantity } },
        });
        await tx.stockMovement.create({
          data: {
            ...key,
            productId: line.productId,
            type: 'RETURN',
            quantity,
            note: `Refund ${order.orderNumber}`,
          },
        });
      }

      const refund = await tx.refund.create({ data: { orderId, ...money } });
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'REFUNDED' },
      });
      return refund;
    });
  }
}
