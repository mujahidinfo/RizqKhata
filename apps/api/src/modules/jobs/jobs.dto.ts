import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { isoDate, paymentMethodSchema, recordedAtSchema } from '../../common/utils.js';

export const JOB_STATUSES = [
  'RECEIVED',
  'DIAGNOSING',
  'WAITING_APPROVAL',
  'WAITING_PARTS',
  'IN_REPAIR',
  'READY',
  'DELIVERED',
  'CANCELLED',
] as const;

/** Stages you can move a job to by hand; DELIVERED only comes from billing it. */
const settableStatus = z.enum(JOB_STATUSES).exclude(['DELIVERED']);

const lineSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional(),
  name: z.string().trim().min(1).max(200),
  price: z.number().nonnegative().finite(),
  quantity: z.number().int().positive().default(1),
});

/** Template intake fields (brand, model, IMEI, lock code, accessories, condition…). */
const details = z.record(z.string(), z.string().trim().max(500));

export class ListJobsQueryDto extends createZodDto(
  z.object({
    /** ACTIVE = not delivered or cancelled. */
    status: z.enum([...JOB_STATUSES, 'ACTIVE']).optional(),
    search: z.string().trim().optional(),
  }),
) {}

export class CreateJobDto extends createZodDto(
  z
    .object({
      customerId: z.string().optional(),
      // Found by phone or created, like a sale's customer.
      customer: z.object({ phone: z.string().trim().min(1), name: z.string().trim().min(1) }).optional(),
      device: z.string().trim().max(120).default(''),
      details: details.default({}),
      problem: z.string().trim().min(1).max(2000),
      estimate: z.number().nonnegative().finite().optional(),
      advance: z.number().nonnegative().finite().default(0),
      advanceMethod: paymentMethodSchema.default('CASH'),
      promisedAt: isoDate.optional(),
      warrantyDays: z.number().int().min(0).max(3650).optional(),
      lines: z.array(lineSchema).default([]),
      // When it was taken in (jobs saved offline and synced later).
      recordedAt: recordedAtSchema,
    })
    .refine((j) => j.customerId || j.customer, { message: 'Add the customer', path: ['customer'] }),
) {}

export class UpdateJobDto extends createZodDto(
  z.object({
    device: z.string().trim().max(120).optional(),
    details: details.optional(),
    problem: z.string().trim().min(1).max(2000).optional(),
    estimate: z.number().nonnegative().finite().nullable().optional(),
    advance: z.number().nonnegative().finite().optional(),
    advanceMethod: paymentMethodSchema.optional(),
    promisedAt: isoDate.nullable().optional(),
    warrantyDays: z.number().int().min(0).max(3650).nullable().optional(),
    /** Replaces all services and parts on the job. */
    lines: z.array(lineSchema).optional(),
  }),
) {}

export class ChangeJobStatusDto extends createZodDto(
  z.object({
    status: settableStatus,
    note: z.string().trim().max(2000).optional(),
    recordedAt: recordedAtSchema,
  }),
) {}

export class AddJobNoteDto extends createZodDto(
  z.object({
    note: z.string().trim().min(1).max(2000),
    recordedAt: recordedAtSchema,
  }),
) {}

export class DeliverJobDto extends createZodDto(
  z.object({
    paymentMethod: paymentMethodSchema.default('CASH'),
    amountTendered: z.number().nonnegative().finite().optional(),
    discountType: z.enum(['percentage', 'fixed']).optional(),
    discountValue: z.number().min(0).default(0),
    taxRate: z.number().min(0).default(0),
  }),
) {}
