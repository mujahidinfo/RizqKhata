# Rizq Khata — Sales Point of Sale (formerly GenPOS; packages, cookies and the iOS bundle id still use `genpos`)

Expo SDK 58 (iOS · Android · web) · NestJS 12 · Next.js 16 (public site) · React 19 · TypeScript 6 · Prisma 6 (PostgreSQL) · Tailwind CSS v4 · pnpm

## Monorepo Layout

pnpm workspaces. Run all commands from the repo root.

```
apps/
  web/        # @genpos/web    — Next.js public site: landing, /about, /privacy, /terms (no app, no API calls)
  api/        # @genpos/api    — NestJS 12 multi-tenant REST API + JWT/Google auth (localhost:4000, see apps/api/README.md)
  mobile/     # @genpos/mobile — Expo SDK 58: THE app, for iOS, Android and the web (app.<domain>), see apps/mobile/README.md
packages/
  db/         # @genpos/db     — Prisma schema, migrations, seed, re-exported client
```

- Import Prisma types/client from `@genpos/db`, never `@prisma/client` directly in apps.
- Env files: `apps/web/.env` (public `NEXT_PUBLIC_*` only), `apps/api/.env` (runtime), `apps/mobile/.env` (`EXPO_PUBLIC_*` only) and `packages/db/.env` (Prisma CLI). See each `.env.example`.
- Only `apps/api` talks to the database. The web site does not use the API or `@genpos/db`.
- The old Next.js admin dashboard was removed: every feature lives in the Expo app, which also builds for the web. Don't add app features to `apps/web`.
- `@genpos/db` is plain JS (`export * from "@prisma/client"`) so it needs no build step for Next or Nest.

## Commands

```bash
pnpm dev          # web (localhost:3000) + api (localhost:4000) in parallel
pnpm dev:web      # public site only
pnpm dev:api      # api only (Swagger at localhost:4000/api/docs)
pnpm dev:mobile   # Expo / Metro (needs the api running)
pnpm build        # build api + web
pnpm lint         # lint api + mobile (web: `next lint` was removed in Next 16 — no ESLint config yet)
pnpm typecheck    # typecheck the public site

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
- Money: `useFormatCurrency()` from `src/lib/format.ts`
- **Language (i18n)**: no hard-coded UI text — add keys to `src/lib/i18n/en.ts` **and** `bn.ts` (typed against en, so a missing Bangla string fails tsc) and render with `const t = useT(); t('section.key', { count, name })` (`{ one, other }` entries pick by `count`). The language is the business setting (`shop.language`, switched instantly from Profile); before sign-in the phone's own choice (`useSetDeviceLanguage`, auth screens) applies. Pass your `t` to the date helpers (`formatDateTime(iso, t)`, `dueLabel(n, t)`) so the React Compiler re-runs them on a language switch. Outside components use `t` from `@/lib/i18n`. Server error messages are still English
- **Business type** (`Business.type` RETAIL · SERVICE · HYBRID, chosen in onboarding / Profile → Business type): `useBusinessType()` / `useModules()` in `src/lib/business.ts` decide modules. Tabs (`components/app-tabs.tsx`): Retail = Sell · Today · Products · Orders · More; Service = Jobs · Sell · Today · Services · More; Both = Sell · Jobs · Today · Catalog · More (Orders stays a hidden tab, linked from More). Services are catalog items with `kind: SERVICE` (no stock; optional `warrantyDays`). Repair jobs: `(tabs)/jobs` board + `[id]`, sheets `job-form` (intake, offline), `job-items` (services/parts), `job-deliver` (bill → normal order with the advance deducted); status changes and notes go through the outbox. Ready messages use free WhatsApp links (`whatsappNumber()`)
- Brand: `BrandLogo` (`src/components/brand-logo.tsx`, wordmark or mark, light/dark) + `APP_NAME`. Logo/icon/splash PNGs in `assets/images` are generated from the root `icon.jpg`/`logo.jpg` (white background removed); Android package is `com.rizqkhata.app`
- Checks: `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor`
- **Web build** (the app at app.<domain>): `pnpm --filter @genpos/mobile export:web` → `dist/` (single-page, `web.output: "single"`). `metro.config.js` serves expo-sqlite's `.wasm` and the COOP/COEP headers it needs; production hosting must send them too (`nginx.conf`). Add the app's web origin to the API's `CORS_ORIGINS`. Release builds throw if `EXPO_PUBLIC_API_URL` is missing; never display it in the UI
- **Release (TestFlight)**: bundle id / package `com.rizqkhata.app`; `eas.json` profiles `preview` + `production` (remote build numbers, `autoIncrement`). `EXPO_PUBLIC_API_URL` comes from EAS environment variables (`eas env:create --environment production …`) and must be https — `scripts/check-release-env.mjs` (`eas-build-pre-install`) fails the build otherwise. Google sign-in is off for the beta (no client IDs → button hidden). Never put server secrets (e.g. UPLOADTHING_TOKEN) in `apps/mobile/.env`; only `EXPO_PUBLIC_*` vars reach the app

## Web site (`apps/web`)

Next.js 16, all pages static. Only the public site: `/` (landing), `/about`, `/privacy`, `/terms`, plus `robots.txt`, `sitemap.xml`, `manifest.webmanifest`.

- Components in `src/components/landing/` (`MarketingShell` = header + footer + language). Long-form About/Privacy/Terms copy is in `page-content.ts`; UI strings in `src/lib/i18n/translations.ts` (`landing` namespace, en + bn).
- "Start free" / "Sign in" link to the app: `NEXT_PUBLIC_APP_URL` + `/sign-up` or `/sign-in`. `NEXT_PUBLIC_SITE_URL` drives canonical links, sitemap and social cards.
- Design system for these pages: `apps/web/DESIGN.md` (`.rk` tokens in `globals.css`).
- `next.config.ts`: `output: "standalone"` (Docker), security headers; CSP and HSTS in production only (dev needs eval).

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
| `OrderItem` | Snapshot of name/price at time of sale; `returnedQty` = units put back on the shelf by refunds |
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

- **IDs**: `cuid()` for all primary keys
- **Timestamps**: `createdAt` / `updatedAt` on all models via Prisma defaults
- **Case-insensitive search**: use `mode: "insensitive" as const` in Prisma string filters
- **Brand colour** is the logo green #17694C: web `brand-50…900` scale / `--rk-green`; mobile `Colors.*.primary` in `src/constants/theme.ts`
- **No secrets or internal addresses in clients**: only `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` reach browsers and phones; never show the API URL or demo credentials in UI or error text
- **Web sign-in security**: in a browser the app sends `X-Auth-Transport: cookie` on `/auth/*`; the API then keeps the refresh token in the httpOnly `rk_rt` cookie (`apps/api/src/modules/auth/auth.cookie.ts`) and leaves it out of the body. The app stores only the marker `COOKIE_SESSION`. iOS/Android keep the keychain + body token

## Deployment

- `apps/api/Dockerfile` (runs `prisma migrate deploy` on start), `apps/web/Dockerfile` (Next standalone), `apps/mobile/Dockerfile.web` (Expo web export on nginx with the COOP/COEP headers expo-sqlite needs). All build from the repo root; `.dockerignore` keeps `.env` files out of images
- iOS/Android ship through EAS (`eas.json`: development · preview · production, remote build numbers). The submit profile needs the App Store Connect app id and a Play service-account key in `apps/mobile/secrets/` (git-ignored)
- `packages/db` postinstall only runs `prisma generate`; migrations run explicitly (`pnpm db:deploy`, or the API container on start)

## Environment Variables

```
# apps/web/.env — public, baked in at build time
NEXT_PUBLIC_APP_NAME="Rizq Khata"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"   # this site
NEXT_PUBLIC_APP_URL="http://localhost:8081"    # the app (Expo web)
NEXT_PUBLIC_CONTACT_EMAIL=""                    # optional, legal pages

# apps/api/.env — DATABASE_URL, JWT_SECRET, CORS_ORIGINS (the app's web origin), TRUST_PROXY (1 behind Coolify),
# GOOGLE_CLIENT_IDS, UPLOADTHING_TOKEN (see apps/api/.env.example). In production the API refuses to start with
# the example JWT_SECRET or a localhost CORS_ORIGINS.
```

## Path Aliases

`@/` → `src/`  
`@/components` → `src/components`  
`@/lib/utils` → `src/lib/utils`
