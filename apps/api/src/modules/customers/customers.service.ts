import { Injectable } from '@nestjs/common';
import type { OrderStatus } from '@genpos/db';
import type { TenantContext } from '../../common/types.js';
import { round2 } from '../../common/utils.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  CreateCustomerDto,
  FindOrCreateCustomerDto,
  UpdateCustomerDto,
} from './customers.dto.js';

/** Orders that count as money spent (not canceled or refunded). */
const COUNTED_STATUSES: OrderStatus[] = ['PENDING', 'PROCESSING', 'FULFILLED'];

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Customers with how much they've spent and when they last bought (all branches). */
  async list(tenant: TenantContext, search?: string) {
    const customers = await this.prisma.customer.findMany({
      where: {
        businessId: tenant.businessId,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      },
      include: { _count: { select: { orders: true } } },
      orderBy: { name: 'asc' },
    });
    if (customers.length === 0) return [];

    const totals = await this.prisma.order.groupBy({
      by: ['customerId'],
      where: {
        businessId: tenant.businessId,
        customerId: { in: customers.map((c) => c.id) },
        status: { in: COUNTED_STATUSES },
      },
      _sum: { total: true },
      _max: { createdAt: true },
    });
    const byCustomer = new Map(totals.map((t) => [t.customerId, t]));
    return customers.map((c) => ({
      ...c,
      totalSpent: round2(byCustomer.get(c.id)?._sum.total ?? 0),
      lastOrderAt: byCustomer.get(c.id)?._max.createdAt ?? null,
    }));
  }

  /** One customer with their buying stats and recent orders (all branches). */
  async getById(tenant: TenantContext, id: string) {
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id, businessId: tenant.businessId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: { items: true, shop: { select: { id: true, name: true } } },
        },
        // Repairs and other service work they brought in.
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { id: true, jobNumber: true, device: true, problem: true, status: true, createdAt: true, shop: { select: { id: true, name: true } } },
        },
      },
    });
    const stats = await this.prisma.order.aggregate({
      where: { businessId: tenant.businessId, customerId: id, status: { in: COUNTED_STATUSES } },
      _sum: { total: true },
      _count: true,
      _min: { createdAt: true },
      _max: { createdAt: true },
    });
    const totalSpent = round2(stats._sum.total ?? 0);
    return {
      ...customer,
      stats: {
        orderCount: stats._count,
        totalSpent,
        averageOrder: stats._count ? round2(totalSpent / stats._count) : 0,
        firstOrderAt: stats._min.createdAt,
        lastOrderAt: stats._max.createdAt,
      },
    };
  }

  /** Partial phone match used by the POS customer lookup; null for short input. */
  getByPhone(tenant: TenantContext, phone: string) {
    const trimmed = phone.trim();
    if (trimmed.length < 4) return null;
    return this.prisma.customer.findFirst({
      where: { businessId: tenant.businessId, phone: { contains: trimmed } },
    });
  }

  create(tenant: TenantContext, input: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: { ...input, businessId: tenant.businessId },
    });
  }

  async findOrCreate(tenant: TenantContext, input: FindOrCreateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { businessId: tenant.businessId, phone: input.phone },
    });
    if (existing) return existing;
    return this.prisma.customer.create({
      data: { ...input, businessId: tenant.businessId },
    });
  }

  update(tenant: TenantContext, id: string, input: UpdateCustomerDto) {
    return this.prisma.customer.update({
      where: { id, businessId: tenant.businessId },
      data: input,
    });
  }

  delete(tenant: TenantContext, id: string) {
    return this.prisma.customer.delete({
      where: { id, businessId: tenant.businessId },
    });
  }
}
