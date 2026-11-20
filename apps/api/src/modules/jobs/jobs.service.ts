import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { JobStatus, Prisma } from '@genpos/db';
import type { AuthUser, TenantContext } from '../../common/types.js';
import { generateJobNumber, recordedAtOrNow, round2 } from '../../common/utils.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateOrderDto } from '../orders/orders.dto.js';
import { OrdersService } from '../orders/orders.service.js';
import type {
  AddJobNoteDto,
  ChangeJobStatusDto,
  CreateJobDto,
  DeliverJobDto,
  ListJobsQueryDto,
  UpdateJobDto,
} from './jobs.dto.js';

const FINAL: JobStatus[] = ['DELIVERED', 'CANCELLED'];

const listInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  lines: true,
} as const;

const detailInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  lines: { orderBy: { createdAt: 'asc' } },
  createdBy: { select: { id: true, name: true } },
  events: { orderBy: { createdAt: 'asc' }, include: { createdBy: { select: { id: true, name: true } } } },
  order: { select: { id: true, orderNumber: true, total: true, depositApplied: true, createdAt: true } },
} as const;

/**
 * Service jobs (repairs): take in → work → bill. Branch-scoped like sales.
 * Billing goes through OrdersService, so a delivered job is an ordinary sale
 * (receipt, reports, stock for parts) with the advance deducted.
 */
@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {}

  list(tenant: TenantContext, { status, search }: ListJobsQueryDto) {
    const where: Prisma.ServiceJobWhereInput = {
      shopId: tenant.shopId,
      ...(status === 'ACTIVE' ? { status: { notIn: FINAL } } : status ? { status } : {}),
      ...(search && {
        OR: [
          { jobNumber: { contains: search, mode: 'insensitive' } },
          { device: { contains: search, mode: 'insensitive' } },
          { problem: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { customer: { phone: { contains: search } } },
          { details: { path: ['imei'], string_contains: search } },
        ],
      }),
    };
    return this.prisma.serviceJob.findMany({
      where,
      include: listInclude,
      orderBy: [{ updatedAt: 'desc' }],
      take: 300,
    });
  }

  /** Counts for the jobs board and the Today screen. */
  async summary(tenant: TenantContext) {
    const [byStatus, held, overdue, deliveredToday] = await Promise.all([
      this.prisma.serviceJob.groupBy({ by: ['status'], where: { shopId: tenant.shopId }, _count: true }),
      this.prisma.serviceJob.aggregate({
        where: { shopId: tenant.shopId, status: { notIn: FINAL } },
        _sum: { advance: true },
      }),
      this.prisma.serviceJob.count({
        where: { shopId: tenant.shopId, status: { notIn: FINAL }, promisedAt: { lt: new Date() } },
      }),
      this.prisma.serviceJob.count({
        where: { shopId: tenant.shopId, status: 'DELIVERED', deliveredAt: { gte: startOfToday() } },
      }),
    ]);
    const counts = Object.fromEntries(byStatus.map((s) => [s.status, s._count])) as Partial<Record<JobStatus, number>>;
    const active = byStatus.filter((s) => !FINAL.includes(s.status)).reduce((n, s) => n + s._count, 0);
    return {
      counts,
      active,
      ready: counts.READY ?? 0,
      overdue,
      deliveredToday,
      advancesHeld: round2(held._sum.advance ?? 0),
    };
  }

  async get(tenant: TenantContext, id: string) {
    const job = await this.prisma.serviceJob.findFirst({ where: { id, shopId: tenant.shopId }, include: detailInclude });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async create(tenant: TenantContext, user: AuthUser, input: CreateJobDto) {
    const { customer, customerId, lines, recordedAt, ...fields } = input;
    const at = recordedAtOrNow(recordedAt);
    await this.assertLines(tenant, lines);

    const job = await this.prisma.$transaction(async (tx) => {
      const ownerId = customerId
        ? (await this.assertCustomer(tx, tenant, customerId)).id
        : (await this.findOrCreateCustomer(tx, tenant, customer!)).id;
      return tx.serviceJob.create({
        data: {
          ...fields,
          businessId: tenant.businessId,
          shopId: tenant.shopId,
          jobNumber: generateJobNumber(),
          customerId: ownerId,
          createdById: user.id,
          createdAt: at,
          lines: { create: lines },
          events: { create: { type: 'CREATED', status: 'RECEIVED', createdById: user.id, createdAt: at } },
        },
      });
    });
    return this.get(tenant, job.id);
  }

  async update(tenant: TenantContext, id: string, input: UpdateJobDto) {
    const job = await this.assertOpen(tenant, id);
    const { lines, ...fields } = input;
    if (lines) await this.assertLines(tenant, lines);
    await this.prisma.$transaction(async (tx) => {
      await tx.serviceJob.update({ where: { id: job.id }, data: fields });
      if (lines) {
        await tx.serviceJobLine.deleteMany({ where: { jobId: job.id } });
        if (lines.length) await tx.serviceJobLine.createMany({ data: lines.map((l) => ({ ...l, jobId: job.id })) });
      }
    });
    return this.get(tenant, id);
  }

  async changeStatus(tenant: TenantContext, user: AuthUser, id: string, input: ChangeJobStatusDto) {
    const job = await this.assertOpen(tenant, id);
    const at = recordedAtOrNow(input.recordedAt);
    await this.prisma.$transaction([
      this.prisma.serviceJob.update({ where: { id: job.id }, data: { status: input.status } }),
      this.prisma.serviceJobEvent.create({
        data: { jobId: job.id, type: 'STATUS', status: input.status, note: input.note, createdById: user.id, createdAt: at },
      }),
    ]);
    return this.get(tenant, id);
  }

  async addNote(tenant: TenantContext, user: AuthUser, id: string, input: AddJobNoteDto) {
    const job = await this.get(tenant, id);
    await this.prisma.serviceJobEvent.create({
      data: { jobId: job.id, type: 'NOTE', note: input.note, createdById: user.id, createdAt: recordedAtOrNow(input.recordedAt) },
    });
    // Touch the job so it rises to the top of the board.
    await this.prisma.serviceJob.update({ where: { id: job.id }, data: { updatedAt: new Date() } });
    return this.get(tenant, id);
  }

  /**
   * Bill and hand over: a normal sale of the job's services and parts, with the
   * advance deducted. The job is marked delivered in the same transaction.
   */
  async deliver(tenant: TenantContext, user: AuthUser, id: string, input: DeliverJobDto) {
    const job = await this.assertOpen(tenant, id);
    const lines = await this.prisma.serviceJobLine.findMany({ where: { jobId: job.id }, orderBy: { createdAt: 'asc' } });
    if (lines.length === 0) throw new BadRequestException('Add the services or parts to charge for first');

    const order: CreateOrderDto = {
      items: lines.map((l) => ({
        productId: l.productId,
        variantId: l.variantId ?? undefined,
        name: l.name,
        price: l.price,
        quantity: l.quantity,
      })),
      customerId: job.customerId,
      type: 'WALK_IN',
      paymentMethod: input.paymentMethod,
      amountTendered: input.amountTendered,
      discountType: input.discountType,
      discountValue: input.discountValue,
      taxRate: input.taxRate,
      note: `${job.jobNumber}${job.device ? ` · ${job.device}` : ''}`,
      status: 'FULFILLED',
      recordedOffline: false,
    };
    const deliveredAt = new Date();
    const created = await this.orders.create(tenant, order, user.id, {
      depositApplied: job.advance,
      inTransaction: async (tx, orderId) => {
        await tx.serviceJob.update({
          where: { id: job.id },
          data: { status: 'DELIVERED', orderId, deliveredAt },
        });
        await tx.serviceJobEvent.create({
          data: { jobId: job.id, type: 'STATUS', status: 'DELIVERED', createdById: user.id, createdAt: deliveredAt },
        });
      },
    });
    return { order: created, job: await this.get(tenant, id) };
  }

  // ─── helpers ──────────────────────────────────────────────────────────────

  private async assertOpen(tenant: TenantContext, id: string) {
    const job = await this.prisma.serviceJob.findFirst({ where: { id, shopId: tenant.shopId } });
    if (!job) throw new NotFoundException('Job not found');
    if (FINAL.includes(job.status)) {
      throw new BadRequestException(job.status === 'DELIVERED' ? 'This job is already delivered' : 'This job is cancelled');
    }
    return job;
  }

  private async assertLines(tenant: TenantContext, lines: { productId: string }[]) {
    if (lines.length === 0) return;
    const ids = [...new Set(lines.map((l) => l.productId))];
    const found = await this.prisma.product.count({ where: { id: { in: ids }, businessId: tenant.businessId } });
    if (found !== ids.length) throw new BadRequestException('Unknown service or part');
  }

  private async assertCustomer(tx: Prisma.TransactionClient, tenant: TenantContext, id: string) {
    const customer = await tx.customer.findFirst({ where: { id, businessId: tenant.businessId } });
    if (!customer) throw new BadRequestException('Unknown customer');
    return customer;
  }

  /** Same rule as sales: one customer per phone per business. */
  private async findOrCreateCustomer(
    tx: Prisma.TransactionClient,
    tenant: TenantContext,
    input: { phone: string; name: string },
  ) {
    const existing = await tx.customer.findFirst({ where: { businessId: tenant.businessId, phone: input.phone } });
    return existing ?? tx.customer.create({ data: { ...input, businessId: tenant.businessId } });
  }
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
