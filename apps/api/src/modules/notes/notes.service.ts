import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@genpos/db';
import { MANAGERS } from '../../common/decorators.js';
import type { AuthUser, TenantContext } from '../../common/types.js';
import { recordedAtOrNow } from '../../common/utils.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateNoteDto, ListNotesQueryDto, UpdateNoteDto } from './notes.dto.js';

const include = { author: { select: { id: true, name: true } } } as const;

/**
 * Notes for later. A note is private to its author unless it's shared, then
 * the whole business sees it and anyone can edit it. Only the author changes
 * who sees it; the author (or an owner/manager, for shared notes) deletes it.
 */
@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  /** What this user may see: their own notes plus the team's shared ones. */
  private visible(tenant: TenantContext, user: AuthUser): Prisma.NoteWhereInput {
    return { businessId: tenant.businessId, OR: [{ authorId: user.id }, { shared: true }] };
  }

  list(tenant: TenantContext, user: AuthUser, { search, status }: ListNotesQueryDto) {
    return this.prisma.note.findMany({
      where: {
        AND: [
          this.visible(tenant, user),
          ...(status ? [{ done: status === 'done' }] : []),
          ...(search
            ? [
                {
                  OR: [
                    { title: { contains: search, mode: 'insensitive' as const } },
                    { body: { contains: search, mode: 'insensitive' as const } },
                  ],
                },
              ]
            : []),
        ],
      },
      include,
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      take: 500,
    });
  }

  async get(tenant: TenantContext, user: AuthUser, id: string) {
    const note = await this.prisma.note.findFirst({ where: { id, ...this.visible(tenant, user) }, include });
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  create(tenant: TenantContext, user: AuthUser, input: CreateNoteDto) {
    const { recordedAt, ...fields } = input;
    const at = recordedAtOrNow(recordedAt);
    return this.prisma.note.create({
      data: { ...fields, businessId: tenant.businessId, authorId: user.id, createdAt: at, updatedAt: at },
      include,
    });
  }

  async update(tenant: TenantContext, user: AuthUser, id: string, input: UpdateNoteDto) {
    const note = await this.get(tenant, user, id);
    if (input.shared !== undefined && input.shared !== note.shared && note.authorId !== user.id) {
      throw new ForbiddenException('Only the author can change who sees this note');
    }
    return this.prisma.note.update({ where: { id: note.id }, data: input, include });
  }

  async delete(tenant: TenantContext, user: AuthUser, id: string) {
    const note = await this.get(tenant, user, id);
    const canDelete = note.authorId === user.id || (note.shared && MANAGERS.includes(tenant.role));
    if (!canDelete) throw new ForbiddenException('Only the author can delete this note');
    await this.prisma.note.delete({ where: { id: note.id } });
    return { success: true };
  }
}
