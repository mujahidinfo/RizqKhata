import type { Prisma } from '@genpos/db';

/**
 * Service templates: what a service business starts with, so the shop is
 * usable a minute after sign-up. Everything seeded is a normal, editable
 * catalog item (kind SERVICE). Release 1 ships mobile repair only.
 */
export const SERVICE_TEMPLATES = {
  mobile_repair: {
    category: { en: 'Mobile repair', bn: 'মোবাইল মেরামত' },
    // Typical Dhaka prices; only used when the business works in BDT.
    services: [
      { en: 'Screen replacement', bn: 'ডিসপ্লে পরিবর্তন', bdt: 2500, warrantyDays: 30 },
      { en: 'Battery replacement', bn: 'ব্যাটারি পরিবর্তন', bdt: 1200, warrantyDays: 30 },
      { en: 'Charging port repair', bn: 'চার্জিং পোর্ট মেরামত', bdt: 500, warrantyDays: 15 },
      { en: 'Software / flashing', bn: 'সফটওয়্যার / ফ্ল্যাশিং', bdt: 500, warrantyDays: 7 },
      { en: 'Speaker / mic repair', bn: 'স্পিকার / মাইক মেরামত', bdt: 400, warrantyDays: 15 },
      { en: 'Back glass / cover change', bn: 'ব্যাক গ্লাস / কভার পরিবর্তন', bdt: 600, warrantyDays: 0 },
      { en: 'Water damage service', bn: 'পানিতে পড়া ফোন সার্ভিস', bdt: 800, warrantyDays: 0 },
      { en: 'Diagnosis / service charge', bn: 'ডায়াগনোসিস / সার্ভিস চার্জ', bdt: 200, warrantyDays: 0 },
    ],
  },
} as const;

export type ServiceTemplateKey = keyof typeof SERVICE_TEMPLATES;
export const SERVICE_TEMPLATE_KEYS = Object.keys(SERVICE_TEMPLATES) as [ServiceTemplateKey, ...ServiceTemplateKey[]];

/**
 * Add a template's starter services to a business, once: skipped when the
 * business already has services (e.g. switching type back and forth).
 */
export async function seedServiceTemplate(
  tx: Prisma.TransactionClient,
  business: { id: string; language: string; currency: string },
  key: ServiceTemplateKey,
) {
  const existing = await tx.product.count({ where: { businessId: business.id, kind: 'SERVICE' } });
  if (existing > 0) return;

  const template = SERVICE_TEMPLATES[key];
  const lang = business.language === 'bn' ? 'bn' : 'en';
  const categoryName = template.category[lang];
  const category =
    (await tx.category.findFirst({ where: { businessId: business.id, name: categoryName } })) ??
    (await tx.category.create({ data: { businessId: business.id, name: categoryName } }));

  for (const service of template.services) {
    await tx.product.create({
      data: {
        businessId: business.id,
        name: service[lang],
        price: business.currency === 'BDT' ? service.bdt : 0,
        kind: 'SERVICE',
        warrantyDays: service.warrantyDays || null,
        categoryId: category.id,
        // Every product has a variant (sales reference it); services never get inventory.
        variants: { create: { name: 'Default', isDefault: true, businessId: business.id } },
      },
    });
  }
}
