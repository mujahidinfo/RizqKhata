import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@genpos/db';
import type { Response } from 'express';
import { from, mergeMap, of, throwError, type Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedRequest } from './types.js';

const HEADER = 'idempotency-key';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;
/** A claim with no result after this long belongs to a request that died. */
const STALE_CLAIM_MS = 60_000;
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Makes writes safe to retry. A mutating request sent with an
 * `Idempotency-Key` header runs once per user + key; repeats get the stored
 * response (with `Idempotent-Replayed: true`) instead of writing again.
 *
 * The mobile app's offline outbox relies on this: if the connection drops
 * after the server saved a sale but before the reply arrived, resending it
 * must not record the sale twice.
 *
 * - The key is claimed before the handler runs, so a duplicate arriving while
 *   the first is still in flight gets 409 (retry later), never a second write.
 * - Failed requests release their claim: handlers run in transactions, so
 *   nothing was written and the client may retry with the same key.
 * - Reusing a key for a different method/path is rejected (422).
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const header = request.headers[HEADER];
    // Only signed-in writes take part (guards have already run).
    if (header === undefined || !MUTATING.has(request.method) || !request.user) {
      return next.handle();
    }
    if (typeof header !== 'string' || !KEY_PATTERN.test(header)) {
      throw new BadRequestException(
        'Idempotency-Key must be 8–100 characters: letters, digits, "-" or "_"',
      );
    }

    const userId = request.user.id;
    const key = header;
    const method = request.method;
    const path = request.originalUrl.split('?')[0];
    const response = http.getResponse<Response>();

    const replay = await this.claim(userId, key, method, path);
    if (replay) {
      response.status(replay.statusCode);
      response.setHeader('Idempotent-Replayed', 'true');
      return of(replay.body);
    }

    const where = { userId_key: { userId, key } };
    return next.handle().pipe(
      mergeMap((body) =>
        from(
          this.prisma.idempotencyKey
            .update({
              where,
              data: {
                statusCode: response.statusCode,
                // Store exactly what the client received (Dates → strings).
                response:
                  body === undefined ? Prisma.DbNull : (JSON.parse(JSON.stringify(body)) as Prisma.InputJsonValue),
              },
            })
            .then(() => body),
        ),
      ),
      catchError((error: unknown) =>
        from(this.prisma.idempotencyKey.deleteMany({ where: { userId, key } })).pipe(
          mergeMap(() => throwError(() => error)),
        ),
      ),
    );
  }

  /** Claims the key, or returns the stored result of the earlier request. */
  private async claim(
    userId: string,
    key: string,
    method: string,
    path: string,
  ): Promise<{ statusCode: number; body: unknown } | null> {
    this.pruneOccasionally();
    try {
      await this.prisma.idempotencyKey.create({ data: { userId, key, method, path } });
      return null;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    }

    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { userId_key: { userId, key } },
    });
    if (!existing) {
      // Released between our insert and read: the first attempt failed.
      return this.claim(userId, key, method, path);
    }
    if (existing.method !== method || existing.path !== path) {
      throw new UnprocessableEntityException(
        'This Idempotency-Key was already used for a different request',
      );
    }
    if (existing.statusCode === null) {
      if (Date.now() - existing.createdAt.getTime() > STALE_CLAIM_MS) {
        await this.prisma.idempotencyKey.deleteMany({ where: { id: existing.id, statusCode: null } });
        return this.claim(userId, key, method, path);
      }
      throw new ConflictException('This request is still being processed. Try again shortly.');
    }
    return { statusCode: existing.statusCode, body: existing.response ?? undefined };
  }

  /** Keys only need to outlive client retries; drop month-old ones now and then. */
  private pruneOccasionally() {
    if (Math.random() > 0.01) return;
    void this.prisma.idempotencyKey
      .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } } })
      .catch(() => undefined);
  }
}
