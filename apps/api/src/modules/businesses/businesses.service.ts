import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TenantContext } from '../../common/types.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { seedServiceTemplate } from './service-templates.js';
import type {
  CreateBusinessDto,
  CreateShopDto,
  SetLanguageDto,
  UpdateShopDto,
} from './businesses.dto.js';

const shopSummary = { id: true, name: true, address: true } as const;

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every business the user belongs to, with the branches they can open. */
  async listForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'asc' },
      include: {
        business: {
          include: {
            shops: {
              where: { isActive: true },
              orderBy: { createdAt: 'asc' },
              select: shopSummary,
            },
          },
        },
      },
    });

    return memberships.map(({ business, role, shopId }) => ({
      id: business.id,
      name: business.name,
      currency: business.currency,
      language: business.language,
      role,
      shops: shopId
        ? business.shops.filter((s) => s.id === shopId)
        : business.shops,
    }));
  }

  /** Onboarding: business + first branch + owner membership, atomically. */
  async create(userId: string, input: CreateBusinessDto) {
    const offersServices = input.businessType !== 'RETAIL';
    const template = offersServices ? (input.serviceTemplate ?? null) : null;
    const business = await this.prisma.$transaction(async (tx) => {
      const created = await tx.business.create({
        data: {
          name: input.name,
          currency: input.currency,
          language: input.language,
          type: input.businessType,
          serviceTemplate: template,
          shops: {
            create: {
              name: input.name,
              phone: input.phone,
              address: input.address,
            },
          },
          members: { create: { userId, role: 'OWNER' } },
        },
        include: { shops: { select: shopSummary } },
      });
      // A ready-made price list, so a repair shop can take its first job right away.
      if (template) await seedServiceTemplate(tx, created, template);
      return created;
    });

    return {
      id: business.id,
      name: business.name,
      currency: business.currency,
      language: business.language,
      role: 'OWNER' as const,
      shops: business.shops,
    };
  }

  // ─── Branches (tenant-scoped) ─────────────────────────────────────────────

  listShops(tenant: TenantContext) {
    return this.prisma.shop.findMany({
      where: { businessId: tenant.businessId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { ...shopSummary, phone: true },
    });
  }

  addShop(tenant: TenantContext, input: CreateShopDto) {
    return this.prisma.shop.create({
      data: { ...input, businessId: tenant.businessId },
      select: { ...shopSummary, phone: true },
    });
  }

  /**
   * Close a branch. Soft: its sales, stock history and expenses stay in the
   * records (reports, customers' order history), but the branch disappears from
   * every list and can't be selected any more. Refused for the last branch and
   * while staff are still assigned only to it (they would lose access).
   */
  async deleteShop(tenant: TenantContext, shopId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId, businessId: tenant.businessId, isActive: true },
    });
    if (!shop) throw new NotFoundException('Branch not found');

    const remaining = await this.prisma.shop.count({
      where: { businessId: tenant.businessId, isActive: true, id: { not: shopId } },
    });
    if (remaining === 0) {
      throw new BadRequestException('This is your only branch, so it can’t be deleted');
    }
    const pinned = await this.prisma.membership.count({
      where: { businessId: tenant.businessId, shopId, isActive: true },
    });
    if (pinned > 0) {
      throw new ConflictException(
        `${pinned} staff member${pinned === 1 ? ' works' : 's work'} only at this branch. Move them to another branch first.`,
      );
    }

    await this.prisma.shop.update({ where: { id: shopId }, data: { isActive: false } });
    return { success: true };
  }

  /** The active branch, flattened with business-wide settings for clients. */
  async currentShop(tenant: TenantContext) {
    const shop = await this.prisma.shop.findUniqueOrThrow({
      where: { id: tenant.shopId },
      include: { business: true },
    });
    const { business, ...rest } = shop;
    return {
      ...rest,
      businessName: business.name,
      currency: business.currency,
      language: business.language,
      businessType: business.type,
      serviceTemplate: business.serviceTemplate,
      role: tenant.role,
    };
  }

  async updateCurrentShop(tenant: TenantContext, input: UpdateShopDto) {
    const { businessName, currency, language, businessType, serviceTemplate, ...shop } = input;
    await this.prisma.$transaction(async (tx) => {
      await tx.shop.update({ where: { id: tenant.shopId }, data: shop });
      const business = await tx.business.update({
        where: { id: tenant.businessId },
        data: {
          name: businessName,
          currency,
          language,
          type: businessType,
          // Keep the template when switching back to retail, in case they return.
          ...(serviceTemplate && { serviceTemplate }),
        },
      });
      // Switching to services: seed the starter price list (once).
      if (business.type !== 'RETAIL' && business.serviceTemplate) {
        await seedServiceTemplate(tx, business, business.serviceTemplate as 'mobile_repair');
      }
    });
    return this.currentShop(tenant);
  }

  async setLanguage(tenant: TenantContext, { language }: SetLanguageDto) {
    await this.prisma.business.update({
      where: { id: tenant.businessId },
      data: { language },
    });
    return this.currentShop(tenant);
  }
}
