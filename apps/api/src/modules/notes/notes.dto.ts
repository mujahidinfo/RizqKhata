import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { recordedAtSchema } from '../../common/utils.js';

const noteFields = z.object({
  title: z.string().trim().max(200).default(''),
  body: z.string().max(10_000).default(''),
  pinned: z.boolean().default(false),
  done: z.boolean().default(false),
  /** Visible to everyone in the business; private to the author otherwise. */
  shared: z.boolean().default(false),
});

export class ListNotesQueryDto extends createZodDto(
  z.object({
    search: z.string().trim().optional(),
    /** open = not ticked off, done = ticked off; omit for all. */
    status: z.enum(['open', 'done']).optional(),
  }),
) {}

export class CreateNoteDto extends createZodDto(
  noteFields
    .extend({
      // When it was written (notes saved offline and synced later).
      recordedAt: recordedAtSchema,
    })
    .refine((n) => n.title.trim() !== '' || n.body.trim() !== '', {
      message: 'Write something first',
      path: ['body'],
    }),
) {}

export class UpdateNoteDto extends createZodDto(
  z.object({
    title: z.string().trim().max(200).optional(),
    body: z.string().max(10_000).optional(),
    pinned: z.boolean().optional(),
    done: z.boolean().optional(),
    shared: z.boolean().optional(),
  }),
) {}
