# Rizq Khata — Sales Point of Sale (formerly GenPOS; packages, cookies and the iOS bundle id still use `genpos`)

Next.js 16 (App Router) · React 19 · TypeScript 6 · Prisma 6 (PostgreSQL) · tRPC v11 · Tailwind CSS v4 · shadcn/ui · pnpm

## Monorepo Layout

pnpm workspaces. Run all commands from the repo root.

```
apps/
  web/        # @genpos/web    — Next.js dashboard; tRPC is a thin backend-for-frontend over the API
  api/        # @genpos/api    — NestJS 12 multi-tenant REST API + JWT/Google auth (localhost:4000, see apps/api/README.md)
  mobile/     # @genpos/mobile — Expo SDK 58 POS app (barcode scanning, sign-up/onboarding), see apps/mobile/README.md
packages/
  db/         # @genpos/db     — Prisma schema, migrations, seed, re-exported client
```

- Import Prisma types/client from `@genpos/db`, never `@prisma/client` directly in apps.
- Env files: `apps/web/.env` (`API_URL`), `apps/api/.env` (runtime) and `packages/db/.env` (Prisma CLI). See each `.env.example`.
- Only `apps/api` talks to the database. The web app imports `@genpos/db` for **types only**.
- `@genpos/db` is plain JS (`export * from "@prisma/client"`) so it needs no build step for Next or Nest.

## Commands

```bash
pnpm dev          # web (localhost:3000) + api (localhost:4000) in parallel
pnpm dev:web      # web only (needs the api running)
pnpm dev:api      # api only (Swagger at localhost:4000/api/docs)
pnpm dev:mobile   # Expo / Metro (needs the api running)
pnpm build        # build api + web
pnpm lint         # lint api + mobile (web: `next lint` was removed in Next 16 — no ESLint config yet)
pnpm typecheck    # typecheck the web app

pnpm db:migrate   # prisma migrate dev
pnpm db:deploy    # prisma migrate deploy (apply committed migrations)
pnpm db:generate  # prisma generate (after schema changes)
pnpm db:push      # prisma db push (no migration file)
pnpm db:seed      # run packages/db/prisma/seed.ts
pnpm db:studio    # open Prisma Studio
```

## API (`apps/api`)

NestJS 12, **native ESM** — relative imports need the `.js` suffix. Full endpoint list in `apps/api/README.md`.

- REST under `/api/v1`; every route needs `Authorization: Bearer <accessToken>` unless decorated `@Public()`
- **Multi-tenant**: `TenantGuard` resolves the branch from the `X-Shop-Id` header; inject it with `@Tenant() tenant: TenantContext` and scope every query by `tenant.businessId` (shared data) or `tenant.shopId` (branch data). Routes not tied to a branch use `@NoTenant()`
- Roles via `@Roles(...MANAGERS)` / `@Roles(...CATALOG_EDITORS)` / `@Roles('OWNER')` — membership roles `OWNER · MANAGER · CASHIER · INVENTORY_MANAGER`
- Validation: zod schemas wrapped with `createZodDto` from `nestjs-zod`; use `isoDate` (not `z.coerce.date()`) for dates so Swagger generation works
- Auth: short-lived JWT access token + rotating opaque refresh token stored SHA-256-hashed in `Session`
- Module layout: `src/modules/<feature>/<feature>.{dto,service,controller,module}.ts`
- **Money out is one ledger**: every payment is an `Expense` with a `source` (MANUAL · SALARY · RECURRING · SUPPLIER_PAYMENT). Supplier payments (`SuppliersService.recordAsExpense`) and salaries (`PayrollService.pay`) create their expense inside the same transaction — never write money out without an `Expense`. Auto-created categories ("Stock purchases", "Salary") come from `finance.ledger.ts`. Supplier-payment expenses are read-only in `ExpensesService`; recurring bills advance `nextDueDate` from the due date, not today
- Uploads (`/uploads`): product photos (catalog editors) and `/uploads/avatar` (any user, `@NoTenant()`); the UploadThing token stays server-side
- **Idempotency**: any POST/PUT/PATCH/DELETE sent with an `Idempotency-Key` header runs once per user + key (`IdempotencyInterceptor`, `IdempotencyKey` table); repeats replay the stored response, a duplicate still in flight gets 409, failures release the key. Offline-capable writes also take an optional `recordedAt` (use `recordedAtOrNow()`); `POST /orders` takes `recordedOffline` (always record, stock may go negative) and an inline `customer: { phone, name }`
- Stock lives in `Inventory` (per branch × variant); every product has ≥1 variant (`isDefault` for simple products). Use `prisma.inventory.fields.lowStock` for low-stock comparisons

## Mobile (`apps/mobile`)

Expo SDK 58 / React Native 0.88. Read `apps/mobile/AGENTS.md` first — Expo APIs change every SDK, verify against versioned docs.

- Add native deps with `npx expo install <pkg>` (run inside apps/mobile), never plain `pnpm add`
- `src/app` is routes only; signed-in area is `(app)/` with NativeTabs and one Stack per tab; auth gate via `Stack.Protected` in `src/app/_layout.tsx`
- API calls go through `api()` in `src/lib/api-client.ts` (token refresh + `X-Shop-Id`); query hooks and mutations live in `src/api/queries.ts`
- Session (`src/lib/session.tsx`) holds user, businesses and the active branch; `useActiveShop()` gives the branch + role. Cart: `src/lib/cart.tsx`
- Routes: `sign-in`/`sign-up`/`onboarding` at the root; signed-in app in `(app)/` = `(tabs)/` (Sell first) + POS/admin modals (`add-item`, `new-product`, `checkout`, `branches`, `receive-stock`, `member-form`, `supplier-form`, `supplier-payment`, `expense-form`, `cart`, `profile`, `shop-form`, `currency`, `change-password`, `pay-bill`, `recurring-form`, `employee-form`, `customer-form`, `note-form`, `sync`; `receive-stock?reorder=1` pre-fills low stock). More tab also has `customers` + `customer/[id]` (owners/managers) and `notes` (everyone; private unless shared, new notes work offline via the outbox); shared chips in `src/components/choice.tsx`
- UI kit: `Icon` (`src/components/icon.tsx` — add icons to `ICONS` with both an SF Symbol and a Material Symbol), `ProductThumb` (photo or tinted monogram), Sell pieces in `src/components/sell/`. Hub/settings pieces: `FeatureTile`, `SettingGroup`/`SettingRow`, `IconTile` (+ `TINT` palette), `Avatar`, `ProfileButton` (theme toggle + avatar), `ShopTitle` — spread `tabHeaderOptions` (`src/components/tab-header.tsx`) into every tab root screen's options; it drops the iOS 26 glass capsule via `hidesSharedBackground`. Tab screens with fixed content above a list use `TabScreen`/`FloatingBottom` (`src/components/safe-area.tsx`). Every sheet/pushed screen in `(app)/` is already wrapped in `HeaderSafeArea` by the stack's `screenLayout` — don't add top padding for the header yourself. List/screen pieces: `FilterBar` (search pill + chips, shared by Products/Orders/Suppliers), `Panel` (white card with an icon heading; `CARD_SHADOW`), `Fab` (+ `FAB_CLEARANCE` for list bottom padding), `CategoryPicker`, `UpcomingRow` (bill/salary with one-tap Pay), `StatTile`. The More tab lives in `(tabs)/more/`. Product photos: `src/lib/product-photo.ts` (pick → compress → upload through the API)
- Money out (More → Expenses/Bills/Staff): all queries sit under the `['expenses']` key in `src/api/queries.ts`, so any payment (expense, salary, bill, supplier) refreshes the whole picture with one invalidation — keep new money hooks under that key. Paying a salary or bill goes through `/pay-bill?kind=SALARY|BILL&id=…`
- File uploads: the global `fetch` is `expo/fetch` (SDK 58), which can't send RN's `{ uri, name, type }` FormData parts — append an expo-file-system `File` instead (see `photoForm` in `src/lib/product-photo.ts`)
- **Offline sync**: the query cache is persisted to SQLite (`PersistQueryClientProvider`, `src/lib/query-client.ts`, 7 days, busted by app version); `src/lib/network.ts` feeds expo-network into React Query's `onlineManager`. Money/stock writes (sale, expense, bill & salary pay, supplier payment, receive stock, new repeating bill) go through `submit()` in `src/lib/outbox.ts`: online → sent now with an `Idempotency-Key`; offline or dropped → queued on disk with the same key and synced in order by `SyncProvider` (on reconnect / foreground / backoff). Hooks return `SubmitResult` (`synced` | `queued`). Other writes need a connection. The product catalog (`['catalog']`) is kept for offline barcode + search. UI: `SyncStatusButton` (top bar), `/sync` sheet, `PendingSyncBanner`
- Profile photo: tap the avatar on `/profile` → `pickProductPhoto(source, AVATAR_WIDTH)` → `uploadAvatarPhoto` → `useSession().updateUser`
- `Icon` cancels Android font scaling (expo-symbols has no `allowFontScaling` switch) so glyphs stay centred in rounded tiles — don't render `SymbolView` directly
- Date helpers (`dayISO`, `formatDayLabel`, `dueLabel`) are in `src/lib/format.ts`; send local-noon ISO strings for date-only values so they never shift across time zones
- Typed routes: `.expo/types` is regenerated by Metro; if `tsc` complains about a route that exists, restart Metro (or run `npx expo start --port 8083` briefly)
- Response types are hand-written in `src/api/types.ts` (dates are ISO strings) — keep in sync with apps/api
- Money: `useFormatCurrency()` from `src/lib/format.ts` (same locale rule as the web app)
- **Language (i18n)**: no hard-coded UI text — add keys to `src/lib/i18n/en.ts` **and** `bn.ts` (typed against en, so a missing Bangla string fails tsc) and render with `const t = useT(); t('section.key', { count, name })` (`{ one, other }` entries pick by `count`). The language is the business setting (`shop.language`, switched instantly from Profile, same as the web dashboard); before sign-in the phone's own choice (`useSetDeviceLanguage`, auth screens) applies. Pass your `t` to the date helpers (`formatDateTime(iso, t)`, `dueLabel(n, t)`) so the React Compiler re-runs them on a language switch. Outside components use `t` from `@/lib/i18n`. Server error messages are still English
- **Business type** (`Business.type` RETAIL · SERVICE · HYBRID, chosen in onboarding / Profile → Business type): `useBusinessType()` / `useModules()` in `src/lib/business.ts` decide modules. Tabs (`components/app-tabs.tsx`): Retail = Sell · Today · Products · Orders · More; Service = Jobs · Sell · Today · Services · More; Both = Sell · Jobs · Today · Catalog · More (Orders stays a hidden tab, linked from More). Services are catalog items with `kind: SERVICE` (no stock; optional `warrantyDays`). Repair jobs: `(tabs)/jobs` board + `[id]`, sheets `job-form` (intake, offline), `job-items` (services/parts), `job-deliver` (bill → normal order with the advance deducted); status changes and notes go through the outbox. Ready messages use free WhatsApp links (`whatsappNumber()`)
- Brand: `BrandLogo` (`src/components/brand-logo.tsx`, wordmark or mark, light/dark) + `APP_NAME`. Logo/icon/splash PNGs in `assets/images` are generated from the root `icon.jpg`/`logo.jpg` (white background removed); Android package is `com.rizqkhata.app`
- Checks: `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`
- **Release (TestFlight)**: bundle id / package `com.rizqkhata.app`; `eas.json` profiles `preview` + `production` (remote build numbers, `autoIncrement`). `EXPO_PUBLIC_API_URL` comes from EAS environment variables (`eas env:create --environment production …`) and must be https — `scripts/check-release-env.mjs` (`eas-build-pre-install`) fails the build otherwise. Google sign-in is off for the beta (no client IDs → button hidden). Never put server secrets (e.g. UPLOADTHING_TOKEN) in `apps/mobile/.env`; only `EXPO_PUBLIC_*` vars reach the app

## Web App (`apps/web`)

All data goes through the REST API. Client components keep using tRPC hooks; each procedure in `src/server/routers/*` forwards to the API with `ctx.api<T>(path, …)` (tokens + `X-Shop-Id` from httpOnly cookies, API errors mapped to tRPC codes).

- `src/server/api.ts` — server-only API client (`apiFetch`, cookie helpers, ISO dates revived to `Date`)
- `src/server/api-types.ts` — response types built from Prisma payload types
- `src/proxy.ts` — Next 16 proxy (ex-middleware): refreshes the access token from the refresh cookie before rendering and ensures an active-branch cookie
- Auth pages: `/login`, `/signup`, `/onboarding` (create business); branch switcher in the header (`components/layout/branch-switcher.tsx`)

### Structure

```
src/
  app/
    (auth)/login/             # public login page
    (dashboard)/              # protected layout — requires session
      dashboard/              # overview + KPIs
      analytics/              # charts & reports
      inventory/              # product & stock management
      orders/                 # order list & detail
      sales/                  # POS / new-sale flow
      customers/              # customer management
      finance/                # finance overview
        expenses/             # expense tracking + category manager
        employees/            # employee & salary management
        budget/               # budget planning
        reports/              # financial report generation
      settings/               # shop settings, users
    api/trpc/[trpc]/          # tRPC HTTP handler
  components/
    ui/                       # shadcn/ui primitives
    layout/                   # Sidebar, Header, LayoutProvider, MainWrapper
    <feature>/                # e.g. analytics/, orders/, inventory/, finance/
      *-view.tsx              # RSC — fetches data via server-side tRPC caller
      *-view-client.tsx       # Client component — receives data as props
  lib/
    auth.ts                   # getSession, requireAuth, canAccess
    prisma.ts                 # PrismaClient singleton (imports from @genpos/db)
    currency-context.tsx      # useFormatCurrency hook + CurrencyProvider
    trpc/
      server.ts               # router, publicProcedure, protectedProcedure, adminProcedure
      client.tsx              # tRPC React client + QueryClientProvider
  server/routers/
    _app.ts                   # root AppRouter
    auth.ts / products.ts / orders.ts / customers.ts
    analytics.ts / shop.ts / users.ts / categories.ts
    finance.ts                # expenses, employees, budget, reports sub-routers
```

Prisma: `packages/db/prisma/schema.prisma` (source of truth), `migrations/`, `seed.ts`.

## Auth (web)

- Cookies (httpOnly): `genpos_at` (access JWT), `genpos_rt` (refresh token), `genpos_shop` (active branch)
- `getSession()` (`lib/auth.ts`) — `GET /auth/me` + `GET /businesses`, cached per request; returns user, active shop and all shops
- `requireAuth(roles?)` — redirects to `/login`, or `/onboarding` when the user has no shop yet
- Web roles stay `ADMIN · CASHIER · INVENTORY_MANAGER`: API `OWNER`/`MANAGER` show as `ADMIN` (`toWebRole`); authorization is enforced by the API

## Database Schema (key models)

| Model | Notes |
|-------|-------|
| `Business` | SaaS account; currency + language shared by its branches |
| `Shop` | A branch/outlet of a business (taxRate, allowNegativeStock) |
| `Membership` | User ↔ Business with role; optional `shopId` pins staff to one branch |
| `User` | Email, optional passwordHash, optional googleId, isActive |
| `Session` | Token-based, has `expiresAt` |
| `Category` | Product categories |
| `Product` | price, costPrice, SKU, barcode, categoryId |
| `ProductVariant` | Every product has ≥1; `isDefault` hidden variant for simple products |
| `Inventory` | Stock per branch × variant (quantity, lowStock) |
| `StockMovement` | IN / OUT / ADJUSTMENT / RETURN |
| `Customer` | Optional; linked to orders |
| `Order` | orderNumber, subtotal, discount, tax, total, paymentMethod, status |
| `OrderItem` | Snapshot of name/price at time of sale |
| `Refund` | Linked to Order |
| `ExpenseCategory` | Finance — expense categories with color |
| `Expense` | Finance — the ledger of money out, one row per payment. `source`: MANUAL · SALARY · RECURRING · SUPPLIER_PAYMENT (supplier payments are mirrored in automatically); optional employee; `periodKey` ("2026-10") stops a salary being paid twice |
| `RecurringExpense` | Repeating bill (rent, internet…): weekly/monthly, `nextDueDate`; paying it creates an `Expense` and moves the date on |
| `Employee` | Finance — staff with salary (MONTHLY/HOURLY/WEEKLY/ANNUALLY) |
| `Budget` | Finance — spending limits by period and optional category |
| `Supplier` | Business-wide; balance = purchases − payments |
| `Purchase` / `PurchaseItem` | Stock received into a branch (adds inventory, updates cost price) |
| `SupplierPayment` | Payment to a supplier, optionally tied to a purchase |
| `Note` | A note for later: title, body, pinned, done; private to its author unless `shared` with the business |
| `ServiceJob` / `ServiceJobLine` / `ServiceJobEvent` | Repair/service job (customer, device + template `details` JSON, problem, status, estimate, advance, promised date), its services & parts, and its timeline. Billing creates an `Order` (`depositApplied` = advance) in the same transaction |
| `IdempotencyKey` | Stored result of a write sent with an `Idempotency-Key` header (offline sync replays) |

Enums: `MemberRole`, `OrderStatus`, `OrderType`, `PaymentMethod`, `StockMovementType`, `SalaryType`, `ExpenseStatus`, `ExpenseSource`, `RecurringFrequency`, `BudgetPeriod`

## Key Conventions

- **RSC + Client split**: server component (`*-view.tsx`) fetches data, passes to a `"use client"` child (`*-view-client.tsx`) as props. The client wrapper uses `dynamic(..., { ssr: false })`.
- **tRPC**: called client-side via `@trpc/react-query` hooks; procedures proxy to the REST API (no direct DB access)
- **Forms**: react-hook-form + zod v4 (`z.flattenError` used in tRPC error formatter)
- **UI**: shadcn/ui with slate base color, CSS variables, Tailwind v4, `@/components` alias. Brand colour is the logo green: use `primary` or the `brand-50…900` scale (`globals.css`), never `indigo-*`. Mobile: `Colors.*.primary` in `src/constants/theme.ts`
- **IDs**: `cuid()` for all primary keys
- **Timestamps**: `createdAt` / `updatedAt` on all models via Prisma defaults
- **Currency**: always use `useFormatCurrency()` from `@/lib/currency-context` in client components that display prices
- **Response types**: add API response shapes to `src/server/api-types.ts` (Prisma payload types) and type `ctx.api<T>()` with them so `inferRouterOutputs` stays accurate
- **Case-insensitive search**: use `mode: "insensitive" as const` in Prisma string filters

## Finance Module

Mobile has its own money-out screens (see Mobile above); the sub-routes below are the web dashboard.

All finance routes are ADMIN-only (`requireAuth(["ADMIN"])`; owners/managers in the API).

Sub-routes under `/finance`:
- `/finance` — overview with income vs expense chart and KPI cards
- `/finance/expenses` — expense CRUD + category manager
- `/finance/employees` — employee salary tracking
- `/finance/budget` — budget planning with progress bars
- `/finance/reports` — income statement, expense report, salary report

The `finance.ts` router uses nested sub-routers:
```
finance.overview
finance.expenseCategories.{list, create, update, delete}
finance.expenses.{list, create, update, delete}
finance.employees.{list, create, update}
finance.budget.{list, create, update, delete}
finance.report
```

Shared sub-navigation: `src/components/finance/finance-nav.tsx` — include in every finance page.

## Environment Variables

```
# apps/web/.env
API_URL="http://localhost:4000/api/v1"
NEXT_PUBLIC_APP_NAME="GenPOS"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# apps/api/.env — DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_IDS … (see apps/api/.env.example)
```

## Path Aliases

`@/` → `src/`  
`@/components` → `src/components`  
`@/lib/utils` → `src/lib/utils`
