/**
 * Response shapes of apps/api, as they arrive over JSON (dates are ISO strings).
 * Only the fields the mobile app reads are listed.
 */

export type Role = 'OWNER' | 'MANAGER' | 'CASHIER' | 'INVENTORY_MANAGER';
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'FULFILLED' | 'CANCELED' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_MONEY' | 'BANK_TRANSFER';
export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

/** A branch the user can open. */
export type ShopSummary = {
  id: string;
  name: string;
  address: string | null;
};

/** A business the user belongs to (GET /businesses). */
export type Workspace = {
  id: string;
  name: string;
  currency: string;
  language: string;
  role: Role;
  shops: ShopSummary[];
};

export type AuthResponse = {
  tokenType: 'Bearer';
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: AuthUser;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/** The active branch with business-wide settings (GET /shop). */
export type Shop = {
  id: string;
  businessId: string;
  businessName: string;
  name: string;
  currency: string;
  language: string;
  role: Role;
  taxRate: number;
  taxName: string;
  allowNegativeStock: boolean;
  address: string | null;
  phone: string | null;
  email: string | null;
  /** What the business does; decides tabs and modules. */
  businessType: BusinessType;
  serviceTemplate: string | null;
};

export type BusinessType = 'RETAIL' | 'SERVICE' | 'HYBRID';
export type ProductKind = 'PRODUCT' | 'SERVICE';

export type Category = {
  id: string;
  name: string;
  color: string | null;
};

export type ProductVariant = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number | null;
  /** Hidden variant of a simple (single) product. */
  isDefault: boolean;
  /** Stock in the active branch. */
  stock: number;
  lowStock: number;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  price: number;
  costPrice: number;
  imageUrl: string | null;
  isActive: boolean;
  /** Services are sold but never stocked. */
  kind: ProductKind;
  warrantyDays: number | null;
  category: Category | null;
  variants: ProductVariant[];
};

export type StockMovement = {
  id: string;
  variantId: string | null;
  type: StockMovementType;
  quantity: number;
  note: string | null;
  createdAt: string;
};

export type ProductDetail = Product & { stockMovements: StockMovement[] };

/** GET /products/barcode/:code — which variant the scanned code points at. */
export type ScannedProduct = Product & { matchedVariantId: string | null };

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

/** GET /customers — with what they've spent across all branches. */
export type CustomerSummary = Customer & {
  address: string | null;
  createdAt: string;
  totalSpent: number;
  lastOrderAt: string | null;
  _count: { orders: number };
};

/** GET /customers/:id — buying stats and their latest orders (all branches). */
export type CustomerDetail = Customer & {
  address: string | null;
  createdAt: string;
  stats: {
    orderCount: number;
    totalSpent: number;
    averageOrder: number;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
  };
  orders: (Omit<Order, 'customer' | 'cashier' | 'refunds'> & { shop: { id: string; name: string } })[];
  jobs: {
    id: string;
    jobNumber: string;
    device: string;
    problem: string;
    status: JobStatus;
    createdAt: string;
    shop: { id: string; name: string };
  }[];
};

// ─── Service jobs ────────────────────────────────────────────────────────────

export type JobStatus =
  | 'RECEIVED'
  | 'DIAGNOSING'
  | 'WAITING_APPROVAL'
  | 'WAITING_PARTS'
  | 'IN_REPAIR'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELLED';

/** Intake fields of the mobile-repair template (all optional). */
export type JobDetails = {
  brand?: string;
  model?: string;
  imei?: string;
  lockCode?: string;
  accessories?: string;
  condition?: string;
};

export type JobLine = {
  id?: string;
  productId: string;
  variantId?: string | null;
  name: string;
  price: number;
  quantity: number;
};

export type Job = {
  id: string;
  jobNumber: string;
  device: string;
  details: JobDetails;
  problem: string;
  status: JobStatus;
  estimate: number | null;
  advance: number;
  advanceMethod: PaymentMethod | null;
  promisedAt: string | null;
  warrantyDays: number | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string; phone: string | null };
  lines: JobLine[];
};

export type JobEvent = {
  id: string;
  type: 'CREATED' | 'STATUS' | 'NOTE';
  status: JobStatus | null;
  note: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
};

export type JobDetail = Job & {
  createdBy: { id: string; name: string };
  events: JobEvent[];
  order: { id: string; orderNumber: string; total: number; depositApplied: number; createdAt: string } | null;
};

export type JobsSummary = {
  counts: Partial<Record<JobStatus, number>>;
  active: number;
  ready: number;
  overdue: number;
  deliveredToday: number;
  advancesHeld: number;
};

/** A note for later; private to its author unless shared with the business. */
export type Note = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  done: boolean;
  shared: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string };
};

export type OrderItem = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  total: number;
  variant?: { id: string; name: string } | null;
};

export type Refund = {
  id: string;
  amount: number;
  reason: string | null;
  createdAt: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  /** Advance paid earlier on a service job, deducted from what was due. */
  depositApplied?: number;
  status: OrderStatus;
  type: 'WALK_IN' | 'ONLINE';
  subtotal: number;
  discountAmt: number;
  taxRate: number;
  taxAmt: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountTendered: number | null;
  note: string | null;
  createdAt: string;
  customer: Customer | null;
  cashier: { id: string; name: string } | null;
  items: OrderItem[];
  refunds: Refund[];
};

export type AnalyticsOverview = {
  totalRevenue: number;
  fulfilledOrders: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  lowStockCount: number;
};

export type SalesChartPoint = { date: string; revenue: number };

export type TopProduct = {
  productId: string;
  name: string;
  totalQty: number;
  totalRevenue: number;
};

// ─── Staff ───────────────────────────────────────────────────────────────────

export type Member = {
  id: string;
  role: Role;
  isActive: boolean;
  /** null = all branches. */
  shopId: string | null;
  user: { id: string; name: string; email: string; avatarUrl: string | null };
  shop: { id: string; name: string } | null;
  /** Payroll entry — present when the person has a monthly salary. */
  employee: { id: string; salary: number; salaryType: SalaryType; payDay: number; isActive: boolean } | null;
};

export type SalaryType = 'MONTHLY' | 'HOURLY' | 'WEEKLY' | 'ANNUALLY';

// ─── Suppliers & purchases ───────────────────────────────────────────────────

export type SupplierBalance = {
  totalPurchased: number;
  totalPaid: number;
  /** What the shop still owes this supplier. */
  due: number;
};

export type Supplier = SupplierBalance & {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
};

export type SupplierPayment = {
  id: string;
  amount: number;
  paymentMethod: PaymentMethod;
  note: string | null;
  purchaseId: string | null;
  createdAt: string;
};

export type SupplierDetail = Supplier & {
  purchases: {
    id: string;
    purchaseNumber: string;
    total: number;
    createdAt: string;
    shop: { id: string; name: string };
  }[];
  payments: SupplierPayment[];
};

export type Purchase = {
  id: string;
  purchaseNumber: string;
  total: number;
  note: string | null;
  createdAt: string;
  supplier: { id: string; name: string } | null;
  receivedBy: { id: string; name: string };
  items: { id: string; name: string; quantity: number; unitCost: number; total: number }[];
  payments: SupplierPayment[];
};

// ─── Expenses ────────────────────────────────────────────────────────────────

export type ExpenseStatus = 'PAID' | 'PENDING' | 'CANCELLED';

export type ExpenseCategory = {
  id: string;
  name: string;
  color: string;
  _count?: { expenses: number };
};

/** How an expense got into the ledger. */
export type ExpenseSource = 'MANUAL' | 'SALARY' | 'SUPPLIER_PAYMENT' | 'RECURRING';

export type Expense = {
  id: string;
  title: string;
  amount: number;
  date: string;
  categoryId: string;
  paymentMethod: PaymentMethod;
  status: ExpenseStatus;
  notes: string | null;
  source: ExpenseSource;
  category: ExpenseCategory;
  employee?: { id: string; name: string; position: string } | null;
};

/** GET /finance/overview — money in and out for the last N days. */
export type FinanceOverview = {
  totalExpenses: number;
  expenseCount: number;
  totalIncome: number;
  orderCount: number;
  netProfit: number;
  expensesByCategory: { categoryId: string; name: string; color: string; amount: number }[];
  expensesBySource: { source: ExpenseSource; amount: number }[];
};

export type PayrollState = 'PAID' | 'DUE' | 'UPCOMING';

export type PayrollItem = {
  employeeId: string;
  /** Set when the person also signs in to the app. */
  membershipId: string | null;
  name: string;
  position: string;
  phone: string | null;
  salary: number;
  salaryType: SalaryType;
  payDay: number;
  /** What this month's pay is (monthly equivalent of the salary). */
  amount: number;
  dueDate: string;
  state: PayrollState;
  paidAmount: number | null;
  paidOn: string | null;
  expenseId: string | null;
};

export type Payroll = {
  month: string;
  label: string;
  items: PayrollItem[];
  totals: { total: number; paid: number; outstanding: number; dueCount: number };
};

export type RecurringFrequency = 'WEEKLY' | 'MONTHLY';

export type RecurringBill = {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  paymentMethod: PaymentMethod;
  frequency: RecurringFrequency;
  nextDueDate: string;
  isActive: boolean;
  notes: string | null;
  category: ExpenseCategory;
  /** Negative = overdue. */
  daysUntil: number;
};

/** Something to pay soon: a recurring bill or a salary. */
export type UpcomingItem = {
  kind: 'BILL' | 'SALARY';
  /** Bill id, or employee id for a salary. */
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  dueDate: string;
  daysUntil: number;
};

export type Upcoming = { items: UpcomingItem[]; total: number; overdueCount: number };

/** GET /purchases/reorder — a low-stock item and where it was last bought. */
export type ReorderSuggestion = {
  productId: string;
  variantId: string;
  name: string;
  imageUrl: string | null;
  stock: number;
  lowStock: number;
  suggestedQuantity: number;
  unitCost: number;
  supplier: { id: string; name: string } | null;
};
