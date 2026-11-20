# Rizq Khata — Point of Sale & Khata

A multi-tenant SaaS point of sale and business manager for small shops in Bangladesh (works anywhere). One account can own many businesses; a business has many branches; each branch has its own stock, sales and spending. Bangla is the default language, English is one tap away.

- **Mobile app** (Expo) — the day-to-day tool on iOS and Android: sell by barcode, run repair jobs, receive stock, track money out. Works offline and syncs when the connection returns. The same code also builds for the web.
- **Web** (Next.js) — the public site (landing, about, privacy, terms) and the current admin dashboard, served through the REST API.
- **REST API** (NestJS) — the single backend every app talks to; the only thing that touches the database.

> Formerly **GenPOS**: package names (`@genpos/*`), cookies and the iOS bundle id still use `genpos`.

## Features

**Selling**
- Barcode-scan POS: scan a product and it lands in the cart, or browse a photo grid and tap. Quick search, category chips, variants.
- Change a line's price at the counter (prices are agreed, not fixed): the list price stays visible with one-tap reset, and a warning shows below cost.
- Checkout with cash received and change, discounts, tax, customer by phone, shareable receipt. Payment by cash, card, mobile money or bank.
- Refunds (owners and managers): partial or full, with a reason; returned items go back on the shelf in the same step. Pending orders can be moved along or canceled.
- Products without a barcode: add them by photo (uploaded to UploadThing through the API), name and price.

**Repair & service shops**
- Business type: Retail, Service or both; the tabs follow it.
- Job cards: intake (customer, device details, problem, advance, promised date), services and parts, a status board, warranty days, a free WhatsApp "ready" message, and billing into a normal order with the advance deducted.

**Works offline**
- Sales, expenses, bill and salary payments, supplier payments, receiving stock, refunds and job updates are saved on the phone when offline and sent in order when the connection returns — each exactly once (`Idempotency-Key`).
- The product list and recent data stay on the phone for offline barcode lookup and search.

**Stock & suppliers**
- Stock is per branch × variant, with low-stock alerts and a one-tap reorder that pre-fills the delivery.
- Receive stock in guided steps (who delivered → scan or search → quantities and costs → payment → confirm).
- Suppliers with a running balance of what you owe, deliveries and payments in one timeline.

**Money out (one ledger)**
- Every payment is an expense with a source: manual, salary, repeating bill or supplier payment. Supplier payments and salaries are recorded automatically when you pay them.
- Salaries: set a monthly pay and pay day on each person (or add payroll-only staff with no login) and pay in one tap.
- Repeating bills (rent, internet…) with due reminders; "to pay soon" shows overdue and upcoming bills and salaries.
- Money in vs money out, spending by category, and the full ledger by day.

**Customers, notes & team**
- Customers by phone number with purchase history and dues; notes for later, private or shared with the team.
- Sign up with email or Google. Roles: Owner, Manager, Cashier, Inventory manager, optionally pinned to one branch.
- Profile with photo, shop details, currency, language, tax and "sell below zero stock" settings.

## Monorepo layout

pnpm workspaces. Run all commands from the repo root.

```
apps/
  api/        # @genpos/api    — NestJS 12 multi-tenant REST API + JWT/Google auth (localhost:4000, Swagger at /api/docs)
  web/        # @genpos/web    — Next.js 16: public pages + admin dashboard; tRPC is a thin backend-for-frontend over the API
  mobile/     # @genpos/mobile — Expo SDK 58 app for iOS, Android and web
packages/
  db/         # @genpos/db     — Prisma schema, migrations, seed, re-exported client
```

| Layer | Technology |
|---|---|
| API | NestJS 12 (native ESM), zod (`nestjs-zod`), Swagger, JWT + rotating refresh tokens, idempotent writes |
| Database | PostgreSQL via Prisma 6 |
| Mobile | Expo SDK 58, React Native 0.88, Expo Router (NativeTabs), TanStack Query (persisted to SQLite), expo-camera |
| Web | Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui, tRPC v11 |
| Language / tooling | TypeScript 6, pnpm |

- Import Prisma types/client from `@genpos/db`, never `@prisma/client` directly in apps.
- Only `apps/api` talks to the database; the web app imports `@genpos/db` for types only.

More detail: [`apps/api/README.md`](apps/api/README.md) (endpoints, tenancy, roles), [`apps/mobile/README.md`](apps/mobile/README.md) (screens and flows) and [`CLAUDE.md`](CLAUDE.md) (conventions).

## Quick start

Prerequisites: Node.js 20+, pnpm, PostgreSQL.

```bash
pnpm install

cp packages/db/.env.example packages/db/.env   # DATABASE_URL (Prisma CLI)
cp apps/api/.env.example apps/api/.env         # DATABASE_URL, JWT_SECRET, …
cp apps/web/.env.example apps/web/.env         # API_URL

pnpm db:deploy     # apply the committed migrations
pnpm db:seed       # optional: demo business with sample data
pnpm dev           # web (localhost:3000) + api (localhost:4000)
pnpm dev:mobile    # Expo / Metro (the api must be running)
```

On a fresh database use `pnpm db:deploy` (not `db:push`) so the data backfills in the migrations run.

The mobile app finds the API on the machine running Metro, so a phone on the same Wi-Fi or an emulator works without config.

**The app in a browser:** `pnpm --filter @genpos/mobile web` (or press `w` in Metro). Add that origin (e.g. `http://localhost:8081`) to `CORS_ORIGINS` in `apps/api/.env` and restart the API, or sign-in fails with "Failed to fetch". The web build is a single-page app (`web.output: "single"`); `metro.config.js` serves SQLite's `.wasm` and the `Cross-Origin-*` headers it needs, and a production host must send the same two headers.

**Windows:** stop the API before `pnpm db:generate` (or `pnpm install`) — a running API locks Prisma's engine file and `prisma generate` fails with `EPERM`.

### Demo logins (after `pnpm db:seed`)

| Role | Email | Password |
|---|---|---|
| Owner | admin@demo.com | admin123 |
| Cashier | cashier@demo.com | cashier123 |
| Inventory manager | inventory@demo.com | inventory123 |

## Commands

```bash
pnpm dev          # web + api in parallel
pnpm dev:web      # web only (needs the api running)
pnpm dev:api      # api only
pnpm dev:mobile   # Expo / Metro (needs the api running)
pnpm build        # build api + web
pnpm lint         # lint api + mobile
pnpm typecheck    # typecheck the web app

pnpm db:migrate   # prisma migrate dev (creates a migration file)
pnpm db:deploy    # prisma migrate deploy (apply committed migrations)
pnpm db:generate  # prisma generate (after schema changes)
pnpm db:push      # prisma db push (no migration file)
pnpm db:seed      # run packages/db/prisma/seed.ts
pnpm db:studio    # open Prisma Studio
```

Mobile checks (inside `apps/mobile`): `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`.

## Environment variables

| File | Variables |
|---|---|
| `apps/api/.env` | `DATABASE_URL`, `JWT_SECRET` (32+ chars), `JWT_ACCESS_TTL`, `REFRESH_TOKEN_TTL_DAYS`, `PORT`, `CORS_ORIGINS` (every browser origin: the web app and, for the app in a browser, its Expo web origin), optional `GOOGLE_CLIENT_IDS` (enables Google sign-in), optional `UPLOADTHING_TOKEN` (enables photo uploads) |
| `packages/db/.env` | `DATABASE_URL` (used by the Prisma CLI) |
| `apps/web/.env` | `API_URL` (e.g. `http://localhost:4000/api/v1`), `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`, optional `NEXT_PUBLIC_CONTACT_EMAIL` (shown on the privacy and terms pages) |
| `apps/mobile/.env` | optional `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — never put server secrets here. Release builds take `EXPO_PUBLIC_API_URL` (https) from EAS environment variables |

## Roles

| Role | Can |
|---|---|
| `OWNER` | Everything, including owners and branches |
| `MANAGER` | Everything except managing owners |
| `INVENTORY_MANAGER` | Sell, add products, receive stock, manage suppliers |
| `CASHIER` | Sell and see orders |

Money screens (expenses, bills, salaries, supplier payments) and refunds are for owners and managers. The web dashboard shows owners and managers as `ADMIN`; the API enforces authorization.

## Data model (key models)

| Model | Notes |
|---|---|
| `Business` / `Shop` | The account and its branches (currency, language and business type live on the business; tax and stock rules per branch) |
| `User` / `Membership` / `Session` | Sign-in, role per business (optionally pinned to a branch), refresh tokens |
| `Category` / `Product` / `ProductVariant` | Catalog; every product has at least one variant; services (`kind: SERVICE`) are never stocked |
| `Inventory` / `StockMovement` | Stock per branch × variant, and its history (IN · OUT · ADJUSTMENT · RETURN) |
| `Order` / `OrderItem` / `Refund` / `Customer` | Sales; `OrderItem.returnedQty` counts units brought back by refunds |
| `ServiceJob` / `ServiceJobLine` / `ServiceJobEvent` | Repair jobs, their services and parts, and their timeline; billing creates an `Order` |
| `Supplier` / `Purchase` / `SupplierPayment` | Stock received and what is owed |
| `Expense` / `ExpenseCategory` | The money-out ledger (`source`: MANUAL · SALARY · RECURRING · SUPPLIER_PAYMENT) |
| `RecurringExpense` | Repeating bills with a next due date |
| `Employee` | Payroll entry (monthly salary, pay day), optionally linked to a staff login |
| `Note` | Notes for later, private unless shared with the business |
| `IdempotencyKey` | Stored result of a write sent with an `Idempotency-Key` header (offline sync replays) |
| `Budget` | Spending limits (used by the web dashboard) |

Schema source of truth: `packages/db/prisma/schema.prisma`.

## Roadmap

The Expo app is becoming the only app for iOS, Android **and** the web, and the Next.js admin dashboard will be retired so features ship once. `apps/web` stays as the public site. Before the switch, the app gets finance reports with print, a wide-screen layout for desktop, and secure web token storage.

## License

MIT
