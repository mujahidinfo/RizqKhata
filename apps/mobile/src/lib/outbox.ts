import type { QueryKey } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

import { ApiError, api, getActiveShopId } from '@/lib/api-client';
import { isOnline } from '@/lib/network';
import { t } from '@/lib/i18n';

/**
 * Offline outbox: money and stock records saved while offline (or when the
 * connection drops mid-request) wait here, on disk, and are sent in order as
 * soon as the app is back online.
 *
 * Every record gets an id that doubles as its `Idempotency-Key`, so however
 * many times it's sent (a reply lost to a dropped connection, the app killed
 * mid-sync…) the API saves it exactly once.
 */

export type OutboxKind =
  | 'sale'
  | 'expense'
  | 'billPayment'
  | 'salary'
  | 'supplierPayment'
  | 'stockIn'
  | 'repeatingBill'
  | 'note'
  | 'job'
  | 'jobStatus'
  | 'jobNote';

export type OutboxItem = {
  /** Also the Idempotency-Key. */
  id: string;
  kind: OutboxKind;
  /** Shown in the sync list, e.g. "Sale" / "3 items". */
  title: string;
  detail?: string;
  amount?: number;
  method: 'POST' | 'PUT' | 'PATCH';
  path: string;
  body: unknown;
  /** The branch it was made in, whatever branch is active when it syncs. */
  shopId: string;
  userId: string;
  createdAt: string;
  status: 'pending' | 'failed';
  attempts: number;
  /** Why the last attempt failed. */
  error?: string;
  /** Query keys to refresh once it's saved. */
  invalidate: QueryKey[];
};

export type SubmitRequest = Pick<
  OutboxItem,
  'kind' | 'title' | 'detail' | 'amount' | 'method' | 'path' | 'body' | 'invalidate'
> & {
  /** Extra body fields used only if the record has to wait in the outbox. */
  offlineBody?: Record<string, unknown>;
  /**
   * Refuse a second record for the same path while one is still waiting, e.g.
   * paying the same bill twice before the first payment synced.
   */
  oncePerPath?: string;
};

/** `synced`: the server has it (and its reply). `queued`: saved on the phone, will sync. */
export type SubmitResult<T> = { status: 'synced'; data: T } | { status: 'queued'; item: OutboxItem };

type State = {
  loaded: boolean;
  items: OutboxItem[];
  syncing: boolean;
  lastSyncedAt: string | null;
  userId: string | null;
};

const STORAGE_KEY = 'rizq.outbox.v1';
const REQUEST_TIMEOUT_MS = 20_000;
/** At the counter, fall back to the outbox quickly on a bad connection. */
const DIRECT_TIMEOUT_MS = 10_000;
const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 5 * 60_000;
/** The API's reply when the same record is still being saved (see IdempotencyInterceptor). */
const IN_FLIGHT_MESSAGE = 'still being processed';

let state: State = { loaded: false, items: [], syncing: false, lastSyncedAt: null, userId: null };
const listeners = new Set<() => void>();
let onSynced: (keys: QueryKey[]) => void = () => {};
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let loading: Promise<void> | null = null;

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function save() {
  void Storage.setItemAsync(
    STORAGE_KEY,
    JSON.stringify({ items: state.items, lastSyncedAt: state.lastSyncedAt }),
  ).catch(() => {});
}

function setItems(items: OutboxItem[]) {
  setState({ items });
  save();
}

function patchItem(id: string, patch: Partial<OutboxItem>) {
  setItems(state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
}

/** Errors worth retrying later: no connection, timeouts, server trouble, signed out. */
function isRetryable(error: unknown) {
  if (!(error instanceof ApiError)) return true;
  const { status } = error;
  return (
    status === 0 ||
    status === 401 ||
    status === 408 ||
    status === 429 ||
    status >= 500 ||
    (status === 409 && error.message.includes(IN_FLIGHT_MESSAGE))
  );
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : t('common.somethingWrong'));

function send<T>(
  item: Pick<OutboxItem, 'id' | 'method' | 'path' | 'body' | 'shopId'>,
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  return api<T>(item.path, {
    method: item.method,
    body: item.body,
    shopId: item.shopId,
    headers: { 'Idempotency-Key': item.id },
    timeoutMs,
  });
}

// ─── Setup ───────────────────────────────────────────────────────────────────

/** Read the saved outbox from disk (once). */
export function loadOutbox() {
  loading ??= (async () => {
    try {
      const raw = await Storage.getItemAsync(STORAGE_KEY);
      const saved = raw ? (JSON.parse(raw) as Pick<State, 'items' | 'lastSyncedAt'>) : null;
      setState({ loaded: true, items: saved?.items ?? [], lastSyncedAt: saved?.lastSyncedAt ?? null });
    } catch {
      setState({ loaded: true });
    }
  })();
  return loading;
}

/**
 * Who is signed in (only their records sync) and what to refresh after a sync.
 * Pass `null` on sign-out: their unsynced records stay on the phone and sync
 * when they sign back in.
 */
export function configureOutbox(options: { userId: string | null; onSynced?: (keys: QueryKey[]) => void }) {
  if (options.onSynced) onSynced = options.onSynced;
  setState({ userId: options.userId });
  if (!options.userId && retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

// ─── Writing ─────────────────────────────────────────────────────────────────

/**
 * Save a record: straight to the server when online, otherwise (or if the
 * connection drops) into the outbox. Real rejections (validation, permissions)
 * still throw, so forms can show them right away.
 */
export async function submit<T>(request: SubmitRequest): Promise<SubmitResult<T>> {
  const shopId = getActiveShopId();
  if (!state.userId || !shopId) throw new Error(t('outbox.signInFirst'));

  await loadOutbox();
  const { offlineBody, oncePerPath, ...fields } = request;
  if (oncePerPath && state.items.some((i) => i.userId === state.userId && i.path === fields.path)) {
    throw new Error(t('outbox.alreadyQueued', { title: oncePerPath }));
  }

  const item: OutboxItem = {
    ...fields,
    id: randomUUID(),
    shopId,
    userId: state.userId,
    createdAt: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
  };

  if (isOnline()) {
    try {
      return { status: 'synced', data: await send<T>(item, DIRECT_TIMEOUT_MS) };
    } catch (error) {
      if (!isRetryable(error)) throw error;
      // The server may or may not have it; the same key makes resending safe.
      item.attempts = 1;
      item.error = messageOf(error);
    }
  }

  if (offlineBody) item.body = { ...(item.body as object), ...offlineBody };
  setItems([...state.items, item]);
  scheduleRetry(item.attempts);
  return { status: 'queued', item };
}

// ─── Syncing ─────────────────────────────────────────────────────────────────

function scheduleRetry(attempts: number) {
  if (retryTimer) clearTimeout(retryTimer);
  const backoff = Math.min(RETRY_BASE_MS * 2 ** Math.max(attempts - 1, 0), RETRY_MAX_MS);
  // Jitter so many phones coming back online don't all hit the API at once.
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void syncNow();
  }, backoff * (0.8 + Math.random() * 0.4));
}

const pendingFor = (userId: string | null) =>
  state.items.filter((item) => item.userId === userId && item.status === 'pending');

/** Send waiting records, oldest first. Safe to call any time; does nothing offline. */
export async function syncNow(): Promise<void> {
  await loadOutbox();
  const { userId } = state;
  if (state.syncing || !userId || !isOnline()) return;

  const queue = pendingFor(userId);
  if (queue.length === 0) return;

  setState({ syncing: true });
  const refresh: QueryKey[] = [];
  let blockedBy: OutboxItem | null = null;

  for (const item of queue) {
    try {
      await send(item);
      setItems(state.items.filter((i) => i.id !== item.id));
      refresh.push(...item.invalidate);
    } catch (error) {
      if (isRetryable(error)) {
        // Keep order: stop here and try again later.
        blockedBy = { ...item, attempts: item.attempts + 1 };
        patchItem(item.id, { attempts: blockedBy.attempts, error: messageOf(error) });
        break;
      }
      // The server won't take it as is; set it aside so the rest still sync.
      patchItem(item.id, { status: 'failed', error: messageOf(error) });
    }
  }

  setState({ syncing: false, ...(!blockedBy && { lastSyncedAt: new Date().toISOString() }) });
  save();

  const unique = new Map(refresh.map((key) => [JSON.stringify(key), key]));
  if (unique.size) onSynced([...unique.values()]);

  if (blockedBy) scheduleRetry(blockedBy.attempts);
  // Records added while this pass ran.
  else if (pendingFor(userId).length) void syncNow();
}

/** Put a rejected record back in the queue (e.g. after fixing the cause). */
export function retryItem(id: string) {
  patchItem(id, { status: 'pending', attempts: 0, error: undefined });
  void syncNow();
}

/** Drop a record for good. */
export function discardItem(id: string) {
  setItems(state.items.filter((item) => item.id !== id));
}

/** Drop everything a user hasn't synced (they chose to sign out anyway). */
export function discardAllFor(userId: string) {
  setItems(state.items.filter((item) => item.userId !== userId));
}

// ─── React ───────────────────────────────────────────────────────────────────

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getState = () => state;

export function useOutbox() {
  return useSyncExternalStore(subscribe, getState, getState);
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'pending' | 'attention';

/** Everything the sync icon and sheet need, for the signed-in user. */
export function useSyncState(online: boolean) {
  const outbox = useOutbox();
  const mine = outbox.items.filter((item) => item.userId === outbox.userId);
  const pending = mine.filter((item) => item.status === 'pending');
  const failed = mine.filter((item) => item.status === 'failed');

  const status: SyncStatus = outbox.syncing
    ? 'syncing'
    : failed.length
      ? 'attention'
      : !online
        ? 'offline'
        : pending.length
          ? 'pending'
          : 'synced';

  return { status, items: mine, pending, failed, lastSyncedAt: outbox.lastSyncedAt, loaded: outbox.loaded };
}
