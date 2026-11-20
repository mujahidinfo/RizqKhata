---
version: 1
slug: "src-components-landing-landing-page-tsx"
primary_target: "src/components/landing/landing-page.tsx"
related_targets: ["src/components/landing/hero.tsx","src/components/landing/one-sale-demo.tsx"]
---

# Landing page (`/`)

## Scope and mode

The public marketing surface at `/`. Visitor mode: **Persuade**. Everything behind
`/login` is Operate and does not inherit this page's marketing flourishes; it shares
only the brand tokens (logo green, slate, Anek Bangla display).

## Audience and job

Bangladeshi small-business owner-operators arriving on a phone. Retail shops first
(grocery, pharmacy, clothing, electronics); service and repair shops (phones,
electronics) as a strong second chapter. Their job: decide whether Rizq Khata
replaces the paper khata and calculator, then start without paying.

## Action

Primary: **Start free** → `/signup` (hero, sticky nav, close). Secondary: sign in.
The phone app is mentioned as "in beta" with no store badge or link until a public
listing exists.

## Proof and content

- Permitted claims (confirmed by the user 2026-11-20): free to start, no card;
  four payment methods; Bangla and English; owner/manager/cashier/stock roles;
  multiple branches per business; repair/service jobs (intake, parts, advance,
  warranty, WhatsApp ready message); one money-out ledger (expenses, salaries,
  repeating bills, supplier payments); **offline selling in the phone app** (sale,
  expense, bill/salary pay, supplier payment, receive stock sync later). The web
  dashboard itself does not sell offline.
- All UI mocks are rendered in code with synthetic demo data and labelled
  "নমুনা তথ্য / Sample data".
- Forbidden until real: customer counts, testimonials, shop names presented as
  customers, logos, ratings, uptime, pricing tiers, store badges.

## Direction contract

THESIS: The canon, played straight and at full craft: a modern product page that
makes "one sale updates everything" visible in real UI. Refuses only the cheap
version of the canon: stock photos, icon-tile feature grids, fake logos and stats.

OWN-WORLD: White and very pale green-grey ground; logo green #17694C owns whole
colour fields (repair section, close) the way bKash/Pathao own their pink/red;
logo slate #3E4651 for text and dark UI. Anek Bangla (variable weight) for display
in both scripts, Inter for Latin body. UI fragments in crisp 1px borders, 16–24px
radii, soft offset shadows; Lucide icons at 1.75 stroke.

STORY: The visitor sees their shop's day on a phone, plays a sale and watches stock,
customer, takings and the khata change, learns it also runs repair jobs, works
offline and keeps every taka going out, then starts free.

FIRST VIEWPORT: Sticky nav (wordmark, section links, বাং/EN, sign in, Start free).
Left: Bangla headline at ~4.5rem desktop, a one-line sub, Start free + Sign in,
and a fact line. Right: a code-rendered phone on the Sell screen with a cart
ringing up and a "synced" chip, with a small receipt/WhatsApp card overlapping.

FORM: Category standard (canon), chosen by the user over the roll; quality bar
Linear/Stripe craft and bKash/Pathao confident local colour; seed key aa9a807f.

SIGNATURE INTERACTION: "One sale" demo: tap a product, and four live panels (stock,
customer, today's takings, khata) update together with a single settle motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment

The one-sale demo. Values never animate in from invisible; they settle.

## Language

Bangla is the default and the design target; English is a toggle.

## Unresolved

- Store links for the phone app once it is public.
- Pricing beyond "free to start".
