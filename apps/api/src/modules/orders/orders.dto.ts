import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  isoDate,
  paginationQuery,
  paymentMethodSchema,
  recordedAtSchema,
} from '../../common/utils.js';

const orderStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'FULFILLED',
  'CANCELED',
  'REFUNDED',
]);

export class ListOrdersQueryDto extends createZodDto(
  paginationQuery(20).extend({
    status: orderStatusSchema.optional(),
    search: z.string().optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
  }),
) {}

export class CreateOrderDto extends createZodDto(
  z.object({
    customerId: z.string().optional(),
    // Alternative to customerId: found by phone (or created) in the same
    // transaction, so an offline sale needs no separate customer call.
    customer: z
      .object({ phone: z.string().trim().min(1), name: z.string().trim().min(1) })
      .optional(),
    type: z.enum(['WALK_IN', 'ONLINE']).default('WALK_IN'),
    items: z
      .array(
        z.object({
          productId: z.string(),
          variantId: z.string().optional(),
          name: z.string(),
          sku: z.string().optional(),
          // Sale price is set per line by the cashier (SMEs negotiate prices),
          // so it is deliberately not checked against the catalogue price —
          // but it must still be a sane, non-negative amount.
          price: z.number().nonnegative().finite(),
          quantity: z.number().int().positive(),
        }),
      )
      .min(1),
    discountType: z.enum(['percentage', 'fixed']).optional(),
    discountValue: z.number().min(0).default(0),
    taxRate: z.number().min(0).default(0),
    paymentMethod: paymentMethodSchema.default('CASH'),
    // Cash handed over, for the change shown on the receipt.
    amountTendered: z.number().nonnegative().finite().optional(),
    note: z.string().optional(),
    // A POS sale is complete the moment it is rung up, so it defaults to
    // FULFILLED. Callers that genuinely need a queue (e.g. online orders
    // awaiting delivery) can still pass PENDING.
    status: z.enum(['PENDING', 'PROCESSING', 'FULFILLED']).default('FULFILLED'),
    // When the sale happened (sales rung up offline and synced later).
    recordedAt: recordedAtSchema,
    // Rung up offline: the goods already left the counter, so the sale is
    // always recorded, even if it takes stock below zero (flags a recount).
    recordedOffline: z.boolean().default(false),
  }),
) {}

export class UpdateOrderStatusDto extends createZodDto(
  z.object({ status: orderStatusSchema }),
) {}

export class CreateRefundDto extends createZodDto(
  z.object({
    amount: z.number().positive(),
    reason: z.string().optional(),
    /** Units that came back and go on the shelf again (stocked lines only). */
    items: z
      .array(
        z.object({
          orderItemId: z.string(),
          quantity: z.number().int().positive(),
        }),
      )
      .optional(),
  }),
) {}
