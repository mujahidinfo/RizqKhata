import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import type {
  AnalyticsOverview,
  Category,
  BusinessType,
  Customer,
  CustomerDetail,
  CustomerSummary,
  Expense,
  ExpenseCategory,
  ExpenseSource,
  FinanceOverview,
  Order,
  OrderStatus,
  Paginated,
  Payroll,
  PaymentMethod,
  Product,
  RecurringBill,
  RecurringFrequency,
  Refund,
  Role,
  SalaryType,
  ProductDetail,
  ReorderSuggestion,
  ScannedProduct,
  Member,
  Note,
  Job,
  JobDetail,
  JobDetails,
  JobLine,
  JobStatus,
  JobsSummary,
  ProductKind,
  Purchase,
  ShopSummary,
  Supplier,
  SupplierDetail,
  SalesChartPoint,
  Shop,
  TopProduct,
  Upcoming,
} from '@/api/types';
import { ApiError, api } from '@/lib/api-client';
import { isOnline } from '@/lib/network';
import { submit, type SubmitResult } from '@/lib/outbox';
import { queryClient as appQueryClient } from '@/lib/query-client';
import { t } from '@/lib/i18n';

const PAGE_SIZE = 20;

const nextPage = <T>(last: Paginated<T>) =>
  last.page * last.pageSize < last.total ? last.page + 1 : undefined;

export function useShop() {
  return useQuery({
    queryKey: ['shop'],
    queryFn: () => api<Shop | null>('/shop'),
    staleTime: 5 * 60_000,
  });
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export function useAnalyticsOverview(days: number) {
  return useQuery({
    queryKey: ['analytics', 'overview', days],
    queryFn: () => api<AnalyticsOverview>('/analytics/overview', { query: { days } }),
  });
}

export function useSalesChart(days: number) {
  return useQuery({
    queryKey: ['analytics', 'sales-chart', days],
    queryFn: () => api<SalesChartPoint[]>('/analytics/sales-chart', { query: { days } }),
  });
}

export function useTopProducts(days: number, limit = 5) {
  return useQuery({
    queryKey: ['analytics', 'top-products', days, limit],
    queryFn: () => api<TopProduct[]>('/analytics/top-products', { query: { days, limit } }),
  });
}

// ─── Products ────────────────────────────────────────────────────────────────

export function useProducts(search: string, categoryId?: string) {
  const queryClient = useQueryClient();
  return useInfiniteQuery({
    queryKey: ['products', 'list', search, categoryId ?? null],
    queryFn: ({ pageParam }) =>
      api<Paginated<Product>>('/products', {
        query: { search, categoryId, page: pageParam, pageSize: PAGE_SIZE },
      }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
    // Offline, a search or category never loaded before is answered from the
    // catalog kept on the phone.
    placeholderData: () => (isOnline() ? undefined : searchCatalog(queryClient, search, categoryId)),
  });
}

// ─── Offline catalog ─────────────────────────────────────────────────────────
//
// Every active product, kept on the phone (the query cache is persisted) so
// scanning and searching work without internet. Its own key, outside
// ['products'], so a sale doesn't re-download the whole catalog.

const CATALOG_KEY = ['catalog'] as const;

export function useOfflineCatalog(enabled: boolean) {
  return useQuery({
    queryKey: CATALOG_KEY,
    queryFn: async () => {
      const all: Product[] = [];
      for (let page = 1; ; page++) {
        const res = await api<Paginated<Product>>('/products', { query: { page, pageSize: 100 } });
        all.push(...res.items);
        if (res.items.length === 0 || res.page * res.pageSize >= res.total) return all;
      }
    },
    enabled,
    staleTime: 10 * 60_000,
  });
}

/** Catalog on the phone, or whatever product pages happen to be cached. */
function cachedProducts(queryClient: QueryClient): Product[] {
  const catalog = queryClient.getQueryData<Product[]>(CATALOG_KEY);
  if (catalog?.length) return catalog;
  const byId = new Map<string, Product>();
  for (const [, data] of queryClient.getQueriesData<InfiniteData<Paginated<Product>>>({
    queryKey: ['products', 'list'],
  })) {
    data?.pages.forEach((page) => page.items.forEach((p) => byId.set(p.id, p)));
  }
  return [...byId.values()];
}

/** Same matching as the API's product search (name, SKU, barcodes). */
function searchCatalog(
  queryClient: QueryClient,
  search: string,
  categoryId?: string,
): InfiniteData<Paginated<Product>, number> {
  const needle = search.trim().toLowerCase();
  const items = cachedProducts(queryClient)
    .filter((p) => !categoryId || p.category?.id === categoryId)
    .filter(
      (p) =>
        !needle ||
        p.name.toLowerCase().includes(needle) ||
        p.sku?.toLowerCase().includes(needle) ||
        p.barcode?.includes(needle) ||
        p.variants.some((v) => v.barcode?.includes(needle)),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  return { pages: [{ items, total: items.length, page: 1, pageSize: items.length || 1 }], pageParams: [1] };
}

function findInCatalog(barcode: string): ScannedProduct | null {
  for (const product of cachedProducts(appQueryClient)) {
    const variant = product.variants.find((v) => v.barcode === barcode);
    if (variant) return { ...product, matchedVariantId: variant.id };
    if (product.barcode === barcode) {
      const only = product.variants.find((v) => v.isDefault) ?? (product.variants.length === 1 ? product.variants[0] : null);
      return { ...product, matchedVariantId: only?.id ?? null };
    }
  }
  return null;
}

/** Move cached stock counts by `deltas` (variantId → ±qty) for records saved offline. */
function adjustCachedStock(queryClient: QueryClient, deltas: Map<string, number>) {
  const patch = <P extends Product>(p: P): P =>
    p.variants.some((v) => deltas.has(v.id))
      ? { ...p, variants: p.variants.map((v) => (deltas.has(v.id) ? { ...v, stock: v.stock + deltas.get(v.id)! } : v)) }
      : p;
  queryClient.setQueriesData<InfiniteData<Paginated<Product>>>({ queryKey: ['products', 'list'] }, (data) =>
    data && { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.map(patch) })) },
  );
  queryClient.setQueriesData<ProductDetail>({ queryKey: ['products', 'detail'] }, (data) => data && patch(data));
  queryClient.setQueryData<Product[]>(CATALOG_KEY, (data) => data?.map(patch));
}

const sumBy = <T>(lines: T[], key: (line: T) => string, qty: (line: T) => number, sign: 1 | -1) => {
  const deltas = new Map<string, number>();
  for (const line of lines) deltas.set(key(line), (deltas.get(key(line)) ?? 0) + sign * qty(line));
  return deltas;
};

const now = () => new Date().toISOString();

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: () => api<ProductDetail>(`/products/${id}`),
    enabled: !!id,
  });
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export function useOrders(filters: { search: string; status?: OrderStatus }) {
  return useInfiniteQuery({
    queryKey: ['orders', 'list', filters],
    queryFn: ({ pageParam }) =>
      api<Paginated<Order>>('/orders', {
        query: { ...filters, page: pageParam, pageSize: PAGE_SIZE },
      }),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', 'detail', id],
    queryFn: () => api<Order>(`/orders/${id}`),
  });
}

// ─── POS ─────────────────────────────────────────────────────────────────────

/** Barcode lookup for the scanner. Resolves null when no product has the code. */
export async function findByBarcode(barcode: string): Promise<ScannedProduct | null> {
  // Offline: look it up in the catalog kept on the phone.
  if (!isOnline()) return findInCatalog(barcode);
  try {
    return await api<ScannedProduct>(`/products/barcode/${encodeURIComponent(barcode)}`, { timeoutMs: 8_000 });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    if (error instanceof ApiError && error.status === 0) return findInCatalog(barcode);
    throw error;
  }
}

export type NewProductInput = {
  name: string;
  price: number;
  costPrice?: number;
  barcode?: string;
  stock?: number;
  categoryId?: string;
  imageUrl?: string;
  kind?: ProductKind;
  warrantyDays?: number;
};

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
    staleTime: 5 * 60_000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string }) =>
      api<Category>('/categories', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewProductInput) =>
      api<Product>('/products', { method: 'POST', body: input }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: CATALOG_KEY }),
      ]),
  });
}

export type ProductUpdateInput = {
  name?: string;
  price?: number;
  costPrice?: number;
  barcode?: string;
  categoryId?: string;
  /** '' removes the photo. */
  imageUrl?: string;
  kind?: ProductKind;
  warrantyDays?: number | null;
};

const PRODUCT_REFRESH = [['products'], CATALOG_KEY, ['analytics']];

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: ProductUpdateInput & { id: string }) =>
      api<ProductDetail>(`/products/${id}`, { method: 'PATCH', body: input }),
    onSuccess: () => Promise.all(PRODUCT_REFRESH.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

/** Set a simple product's stock in the active branch (recorded as a stock count). */
export function useSetStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity, note }: { id: string; quantity: number; note?: string }) =>
      api(`/products/${id}/stock`, { method: 'POST', body: { type: 'ADJUSTMENT', quantity, note } }),
    onSuccess: () => Promise.all(PRODUCT_REFRESH.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

/** Hides the product from selling and lists; past sales keep showing it. */
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => Promise.all(PRODUCT_REFRESH.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

export type NewOrderInput = {
  items: {
    productId: string;
    variantId: string;
    name: string;
    sku?: string;
    price: number;
    quantity: number;
  }[];
  paymentMethod: PaymentMethod;
  amountTendered?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  taxRate: number;
  customerId?: string;
  /** Found by phone or created with the sale (no separate call, works offline). */
  customer?: { phone: string; name: string };
  /** Counter sales are always completed. */
  status?: 'FULFILLED';
};

const SALE_REFRESH = [['orders'], ['products'], ['analytics']];
// A refund lowers takings, so the money overview (under ['expenses']) refreshes too.
const REFUND_REFRESH = [['orders'], ['analytics'], ['expenses']];

/**
 * Give money back on an order (owners and managers). It goes through the
 * outbox like any money write: one Idempotency-Key, so a retry can never pay
 * the customer twice, and it waits on the phone when offline. Stock is not
 * changed; the API records money only.
 */
export function useRefundOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, orderNumber, ...input }: { orderId: string; orderNumber: string; amount: number; reason?: string }) =>
      submit<Refund>({
        kind: 'refund',
        title: t('outbox.refund', { number: orderNumber }),
        amount: input.amount,
        method: 'POST',
        path: `/orders/${orderId}/refunds`,
        body: input,
        invalidate: REFUND_REFRESH,
      }),
    onSuccess: (result) =>
      result.status === 'synced' &&
      Promise.all(REFUND_REFRESH.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

/** Move a pending or processing order along (needs a connection). */
export function useOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api<Order>(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: () =>
      Promise.all([['orders'], ['analytics']].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

/**
 * Ring up a sale. Online it's saved straight away; offline (or if the
 * connection drops) it waits in the outbox and syncs later, and the cached
 * stock counts go down now so the shelf numbers stay believable.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ total, ...input }: NewOrderInput & { total: number }) =>
      submit<Order>({
        kind: 'sale',
        title: t('outbox.sale'),
        detail: t('common.items', { count: input.items.reduce((n, i) => n + i.quantity, 0) }),
        amount: total,
        method: 'POST',
        path: '/orders',
        body: { ...input, recordedAt: now() },
        // Goods already left the counter: always record it (server may let stock go negative).
        offlineBody: { recordedOffline: true },
        invalidate: SALE_REFRESH,
      }),
    onSuccess: (result, input) => {
      if (result.status === 'queued') {
        adjustCachedStock(queryClient, sumBy(input.items, (i) => i.variantId, (i) => i.quantity, -1));
        return;
      }
      return Promise.all(SALE_REFRESH.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
  });
}

export function useFindOrCreateCustomer() {
  return useMutation({
    mutationFn: (input: { phone: string; name: string }) =>
      api<Customer>('/customers/find-or-create', { method: 'POST', body: input }),
  });
}

export function useCustomerLookup(phone: string) {
  const trimmed = phone.trim();
  return useQuery({
    queryKey: ['customers', 'lookup', trimmed],
    queryFn: () => api<Customer | null>('/customers/lookup', { query: { phone: trimmed } }),
    enabled: trimmed.length >= 6,
  });
}

// ─── Customers (owners & managers) ───────────────────────────────────────────

export function useCustomers(enabled = true) {
  return useQuery({
    queryKey: ['customers', 'list'],
    queryFn: () => api<CustomerSummary[]>('/customers'),
    enabled,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: () => api<CustomerDetail>(`/customers/${id}`),
    enabled: !!id,
  });
}

export type CustomerInput = { name: string; phone?: string; email?: string; address?: string };

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CustomerInput & { id: string }) =>
      api<Customer>(`/customers/${id}`, { method: 'PATCH', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] }),
  });
}

// ─── Service jobs (repairs) ──────────────────────────────────────────────────
//
// Under the 'jobs' key; billing a job also refreshes sales.

const JOB_REFRESH = [['jobs'], ['customers']];

export function useJobs(status?: JobStatus | 'ACTIVE') {
  return useQuery({
    queryKey: ['jobs', 'list', status ?? 'all'],
    queryFn: () => api<Job[]>('/jobs', { query: { status } }),
  });
}

export function useJobsSummary(enabled = true) {
  return useQuery({
    queryKey: ['jobs', 'summary'],
    queryFn: () => api<JobsSummary>('/jobs/summary'),
    enabled,
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ['jobs', 'detail', id],
    queryFn: () => api<JobDetail>(`/jobs/${id}`),
    enabled: !!id,
  });
}

export type NewJobInput = {
  customerId?: string;
  customer?: { phone: string; name: string };
  device: string;
  details: JobDetails;
  problem: string;
  estimate?: number;
  advance: number;
  advanceMethod: PaymentMethod;
  promisedAt?: string;
};

/** Taking in a job works offline (outbox) — the counter can't wait for the internet. */
export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewJobInput & { customerName: string }) => {
      const { customerName, ...body } = input;
      return submit<JobDetail>({
        kind: 'job',
        title: [customerName, body.device].filter(Boolean).join(' · '),
        detail: body.problem.slice(0, 60),
        amount: body.advance || undefined,
        method: 'POST',
        path: '/jobs',
        body: { ...body, recordedAt: now() },
        invalidate: JOB_REFRESH,
      });
    },
    onSuccess: (result) =>
      result.status === 'synced' && Promise.all(JOB_REFRESH.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<Omit<NewJobInput, 'customer' | 'customerId'>> & { id: string; lines?: JobLine[] }) =>
      api<JobDetail>(`/jobs/${id}`, { method: 'PATCH', body: input }),
    onSuccess: (job) => {
      queryClient.setQueryData(['jobs', 'detail', job.id], job);
      return queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

/** Moving a job along works offline too; the screen updates at once. */
export function useJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note, label }: { id: string; status: JobStatus; note?: string; label: string }) =>
      submit<JobDetail>({
        kind: 'jobStatus',
        title: label,
        method: 'POST',
        path: `/jobs/${id}/status`,
        body: { status, note, recordedAt: now() },
        invalidate: JOB_REFRESH,
      }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['jobs', 'detail', id] });
      queryClient.setQueryData<JobDetail>(['jobs', 'detail', id], (job) => job && { ...job, status });
    },
    onSuccess: (result) =>
      result.status === 'synced' && Promise.all(JOB_REFRESH.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

export function useJobNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note, label }: { id: string; note: string; label: string }) =>
      submit<JobDetail>({
        kind: 'jobNote',
        title: label,
        detail: note.slice(0, 60),
        method: 'POST',
        path: `/jobs/${id}/notes`,
        body: { note, recordedAt: now() },
        invalidate: [['jobs']],
      }),
    onSuccess: (result) => result.status === 'synced' && queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });
}

export type DeliverJobInput = {
  paymentMethod: PaymentMethod;
  amountTendered?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  taxRate: number;
};

/** Bill and hand over (online): a normal sale with the advance deducted. */
export function useDeliverJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: DeliverJobInput & { id: string }) =>
      api<{ order: Order; job: JobDetail }>(`/jobs/${id}/deliver`, {
        method: 'POST',
        body: input,
        headers: { 'Idempotency-Key': `deliver-${id}` },
      }),
    onSuccess: () =>
      Promise.all(
        [['jobs'], ['orders'], ['products'], ['analytics'], ['customers'], CATALOG_KEY].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

// ─── Notes (everyone) ────────────────────────────────────────────────────────

export function useNotes() {
  return useQuery({
    queryKey: ['notes'],
    queryFn: () => api<Note[]>('/notes'),
  });
}

/** One note, straight from the list cache when it's there. */
export function useNote(id: string | undefined) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['notes', 'detail', id],
    queryFn: () => api<Note>(`/notes/${id}`),
    enabled: !!id,
    initialData: () => queryClient.getQueryData<Note[]>(['notes'])?.find((n) => n.id === id),
  });
}

export type NoteInput = { title: string; body: string; pinned: boolean; done: boolean; shared: boolean };

/** New notes work offline (outbox); editing and deleting need a connection. */
export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NoteInput) =>
      submit<Note>({
        kind: 'note',
        title: input.title.trim() || input.body.trim().split('\n')[0].slice(0, 60),
        method: 'POST',
        path: '/notes',
        body: { ...input, recordedAt: now() },
        invalidate: [['notes']],
      }),
    onSuccess: (result) => result.status === 'synced' && queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<NoteInput> & { id: string }) =>
      api<Note>(`/notes/${id}`, { method: 'PATCH', body: input }),
    // Ticking a note off or pinning it should feel instant.
    onMutate: async ({ id, ...input }) => {
      await queryClient.cancelQueries({ queryKey: ['notes'] });
      const previous = queryClient.getQueryData<Note[]>(['notes']);
      queryClient.setQueryData<Note[]>(['notes'], (notes) => notes?.map((n) => (n.id === id ? { ...n, ...input } : n)));
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(['notes'], context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/notes/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes'] }),
  });
}

// ─── Branches ────────────────────────────────────────────────────────────────

export function useAddShop() {
  return useMutation({
    mutationFn: (input: { name: string; phone?: string; address?: string }) =>
      api<ShopSummary>('/shops', { method: 'POST', body: input }),
  });
}

/** Close a branch (owners). Its records stay; it just can't be used any more. */
export function useDeleteShop() {
  return useMutation({
    mutationFn: (id: string) => api(`/shops/${id}`, { method: 'DELETE' }),
  });
}

// ─── Staff ───────────────────────────────────────────────────────────────────

export function useMembers() {
  return useQuery({ queryKey: ['members'], queryFn: () => api<Member[]>('/members') });
}

export type MemberInput = {
  name: string;
  email: string;
  password?: string;
  role: Role;
  shopId?: string;
  /** Monthly pay — adds them to payroll. */
  salary?: number;
  payDay?: number;
};

export function useAddMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MemberInput) => api<Member>('/members', { method: 'POST', body: input }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['members'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
      ]),
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      role?: Role;
      isActive?: boolean;
      shopId?: string | null;
      /** null or 0 takes them off payroll. */
      salary?: number | null;
      payDay?: number;
    }) => api<Member>(`/members/${id}`, { method: 'PATCH', body: input }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['members'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
      ]),
  });
}

// ─── Suppliers & purchases ───────────────────────────────────────────────────

export function useSuppliers(enabled = true) {
  return useQuery({
    queryKey: ['suppliers', 'list'],
    queryFn: () => api<Supplier[]>('/suppliers'),
    enabled,
  });
}

export function useSupplier(id: string | undefined) {
  return useQuery({
    queryKey: ['suppliers', 'detail', id],
    queryFn: () => api<SupplierDetail>(`/suppliers/${id}`),
    enabled: !!id,
  });
}

export type SupplierInput = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

export function useSaveSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: SupplierInput & { id?: string }) =>
      id
        ? api<Supplier>(`/suppliers/${id}`, { method: 'PATCH', body: input })
        : api<Supplier>('/suppliers', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

// A supplier payment is also an expense.
const SUPPLIER_PAYMENT_REFRESH = [['suppliers'], ['expenses']];

export function usePaySupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      supplierId,
      supplierName,
      ...input
    }: {
      supplierId: string;
      supplierName: string;
      amount: number;
      paymentMethod: PaymentMethod;
      note?: string;
    }) =>
      submit<SupplierDetail>({
        kind: 'supplierPayment',
        title: t('outbox.paidSupplier', { name: supplierName }),
        amount: input.amount,
        method: 'POST',
        path: `/suppliers/${supplierId}/payments`,
        body: { ...input, recordedAt: now() },
        invalidate: SUPPLIER_PAYMENT_REFRESH,
      }),
    onSuccess: (result) =>
      result.status === 'synced' &&
      Promise.all(SUPPLIER_PAYMENT_REFRESH.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  });
}

export type PurchaseInput = {
  supplierId?: string;
  items: { productId: string; variantId: string; quantity: number; unitCost: number }[];
  paidAmount: number;
  paymentMethod: PaymentMethod;
  /** Keep each product's cost price in step with this delivery (server default: on). */
  updateCostPrice?: boolean;
  note?: string;
};

const PURCHASE_REFRESH = [['products'], ['suppliers'], ['analytics'], ['expenses'], CATALOG_KEY];

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ total, ...input }: PurchaseInput & { total: number }) =>
      submit<Purchase>({
        kind: 'stockIn',
        title: t('receive.stockReceived'),
        detail: t('common.units', { count: input.items.reduce((n, i) => n + i.quantity, 0) }),
        amount: total,
        method: 'POST',
        path: '/purchases',
        body: { ...input, recordedAt: now() },
        invalidate: PURCHASE_REFRESH,
      }),
    onSuccess: (result, input) => {
      if (result.status === 'queued') {
        adjustCachedStock(queryClient, sumBy(input.items, (i) => i.variantId, (i) => i.quantity, 1));
        return;
      }
      return Promise.all(PURCHASE_REFRESH.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    },
  });
}

// ─── Money out: expenses, payroll, recurring bills (owner/manager) ───────────
//
// Every query lives under the 'expenses' key, so recording any payment
// (expense, salary, bill, supplier) refreshes the whole money picture at once.

export type ExpenseFilters = { categoryId?: string; source?: ExpenseSource; days?: number };

export function useExpenses(filters: ExpenseFilters = {}) {
  const { days, ...rest } = filters;
  return useInfiniteQuery({
    queryKey: ['expenses', 'list', filters],
    queryFn: ({ pageParam }) => {
      // Whole days ending today, worked out per request so a screen left open overnight stays right.
      const from = days ? new Date(Date.now() - (days - 1) * 86_400_000) : undefined;
      from?.setHours(0, 0, 0, 0);
      return api<Paginated<Expense> & { totalAmount: number }>('/finance/expenses', {
        query: { ...rest, from: from?.toISOString(), page: pageParam, pageSize: PAGE_SIZE },
      });
    },
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}

/** One expense by id — straight from the API so it works from any list or link. */
export function useExpense(id: string | undefined) {
  return useQuery({
    queryKey: ['expenses', 'detail', id],
    queryFn: async () => {
      // No single-item endpoint: the filtered list is cheap and cached.
      const res = await api<Paginated<Expense>>('/finance/expenses', { query: { pageSize: 100 } });
      return res.items.find((e) => e.id === id) ?? null;
    },
    enabled: !!id,
  });
}

export function useFinanceOverview(days: number) {
  return useQuery({
    queryKey: ['expenses', 'overview', days],
    queryFn: () => api<FinanceOverview>('/finance/overview', { query: { days } }),
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ['expenses', 'categories'],
    queryFn: () => api<ExpenseCategory[]>('/finance/expense-categories'),
    staleTime: 5 * 60_000,
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; color: string }) =>
      api<ExpenseCategory>('/finance/expense-categories', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses', 'categories'] }),
  });
}

export type ExpenseInput = {
  title: string;
  amount: number;
  date: string;
  categoryId: string;
  paymentMethod: PaymentMethod;
  notes?: string;
};

/** New expenses work offline (outbox); editing one needs a connection. */
export function useSaveExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: ExpenseInput & { id?: string }): Promise<SubmitResult<Expense>> =>
      id
        ? { status: 'synced', data: await api<Expense>(`/finance/expenses/${id}`, { method: 'PATCH', body: input }) }
        : submit<Expense>({
            kind: 'expense',
            title: input.title,
            amount: input.amount,
            method: 'POST',
            path: '/finance/expenses',
            body: input,
            invalidate: [['expenses']],
          }),
    onSuccess: (result) => result.status === 'synced' && queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/finance/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

/** Bills and salaries that are overdue or due within `days`. */
export function useUpcoming(days = 7, enabled = true) {
  return useQuery({
    queryKey: ['expenses', 'upcoming', days],
    queryFn: () => api<Upcoming>('/finance/upcoming', { query: { days } }),
    enabled,
  });
}

/** Salaries for a month ('2026-10'); omit for this month. */
export function usePayroll(month?: string, enabled = true) {
  return useQuery({
    queryKey: ['expenses', 'payroll', month ?? 'current'],
    queryFn: () => api<Payroll>('/finance/payroll', { query: { month } }),
    enabled,
  });
}

export function usePaySalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      ...input
    }: {
      employeeId: string;
      amount?: number;
      paymentMethod: PaymentMethod;
      month?: string;
      note?: string;
      /** For the sync list, e.g. "Rahim · salary". */
      label: string;
    }) => {
      const { label, ...body } = input;
      return submit<Expense>({
        kind: 'salary',
        title: label,
        amount: body.amount,
        method: 'POST',
        path: `/finance/employees/${employeeId}/pay`,
        body: { ...body, recordedAt: now() },
        invalidate: [['expenses']],
        oncePerPath: label,
      });
    },
    onSuccess: (result) => result.status === 'synced' && queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export type EmployeeInput = {
  name: string;
  position: string;
  phone?: string;
  salary: number;
  salaryType: SalaryType;
  payDay: number;
  joinDate: string;
  isActive?: boolean;
};

/** Staff on payroll who don't sign in to the app. */
export function useSaveEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<EmployeeInput> & { id?: string }) =>
      id
        ? api(`/finance/employees/${id}`, { method: 'PATCH', body: input })
        : api('/finance/employees', { method: 'POST', body: input }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['members'] }),
      ]),
  });
}

export function useRecurringBills() {
  return useQuery({
    queryKey: ['expenses', 'recurring'],
    queryFn: () => api<RecurringBill[]>('/finance/recurring'),
  });
}

export type RecurringInput = {
  title: string;
  amount: number;
  categoryId: string;
  paymentMethod: PaymentMethod;
  frequency: RecurringFrequency;
  nextDueDate: string;
  notes?: string;
  isActive?: boolean;
};

/** New repeating bills work offline (outbox); editing one needs a connection. */
export function useSaveRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<RecurringInput> & { id?: string }): Promise<SubmitResult<RecurringBill>> =>
      id
        ? { status: 'synced', data: await api<RecurringBill>(`/finance/recurring/${id}`, { method: 'PATCH', body: input }) }
        : submit<RecurringBill>({
            kind: 'repeatingBill',
            title: t('outbox.repeating', { title: input.title ?? t('outbox.bill') }),
            amount: input.amount,
            method: 'POST',
            path: '/finance/recurring',
            body: input,
            invalidate: [['expenses']],
          }),
    onSuccess: (result) => result.status === 'synced' && queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useDeleteRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/finance/recurring/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function usePayRecurring() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      label,
      ...input
    }: {
      id: string;
      amount?: number;
      paymentMethod?: PaymentMethod;
      /** For the sync list, e.g. "Rent". */
      label: string;
    }) =>
      submit<Expense>({
        kind: 'billPayment',
        title: label,
        amount: input.amount,
        method: 'POST',
        path: `/finance/recurring/${id}/pay`,
        body: { ...input, date: now() },
        invalidate: [['expenses']],
        oncePerPath: label,
      }),
    onSuccess: (result) => result.status === 'synced' && queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });
}

export function useReorderSuggestions(enabled: boolean, supplierId?: string) {
  return useQuery({
    queryKey: ['products', 'reorder', supplierId ?? null],
    queryFn: () => api<ReorderSuggestion[]>('/purchases/reorder', { query: { supplierId } }),
    enabled,
  });
}

// ─── Shop settings & account ─────────────────────────────────────────────────

/** Fields of PUT /shop (all optional). Applies to the active branch, plus business-wide currency/language. */
export type ShopSettingsInput = {
  name?: string;
  businessName?: string;
  phone?: string;
  address?: string;
  email?: string;
  currency?: string;
  language?: 'en' | 'bn';
  taxRate?: number;
  taxName?: string;
  allowNegativeStock?: boolean;
  businessType?: BusinessType;
  serviceTemplate?: 'mobile_repair';
};

export function useUpdateShop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ShopSettingsInput) => api<Shop>('/shop', { method: 'PUT', body: input }),
    // Apply at once (e.g. the whole app switches language on tap), roll back if the save fails.
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['shop'] });
      const previous = queryClient.getQueryData<Shop | null>(['shop']);
      if (previous) queryClient.setQueryData<Shop>(['shop'], { ...previous, ...input } as Shop);
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(['shop'], context.previous);
    },
    // Prices on screen depend on currency, language and tax.
    onSuccess: (shop) => queryClient.setQueryData(['shop'], shop),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword?: string; newPassword: string }) =>
      api<{ success: boolean }>('/auth/password', { method: 'PATCH', body: input }),
  });
}
