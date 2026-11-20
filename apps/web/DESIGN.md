---
name: Rizq Khata (public marketing pages)
description: Bangla-first sales and khata app for shops in Bangladesh; this system governs /, /about, /privacy and /terms only.
colors:
  logo-green: "#17694c"
  green-deep: "#0f4332"
  green-ink: "#0b3527"
  mint: "#edf7f2"
  mint-2: "#d3ede0"
  leaf: "#74c29f"
  slate: "#3e4651"
  ink: "#1d232b"
  muted: "#5b6470"
  line: "#e3e7e5"
  ground: "#ffffff"
  ground-2: "#f5f7f6"
  amber: "#b7791f"
  amber-wash: "#fdf3e1"
  device-black: "#151a20"
typography:
  display:
    fontFamily: "Anek Bangla, Inter, sans-serif"
    fontSize: "clamp(2.35rem, 5.4vw, 4.4rem)"
    fontWeight: 650
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Anek Bangla, Inter, sans-serif"
    fontSize: "clamp(1.9rem, 3.6vw, 3rem)"
    fontWeight: 650
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Anek Bangla, Inter, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 650
    lineHeight: 1.375
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, Anek Bangla, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "Inter, Anek Bangla, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 600
    lineHeight: 1.4
  figure:
    fontFamily: "Anek Bangla, Inter, sans-serif"
    fontSize: "2.1rem"
    fontWeight: 650
    lineHeight: 1.25
    fontFeature: "\"tnum\" 1"
rounded:
  tag: "6px"
  tile-icon: "12px"
  row: "16px"
  panel: "24px"
  card: "28px"
  field: "40px"
  device: "44px"
  pill: "9999px"
spacing:
  gutter: "16px"
  gutter-sm: "24px"
  grid-gap: "16px"
  card-pad: "24px"
  card-pad-sm: "28px"
  section-y: "80px"
  section-y-sm: "112px"
  container: "76rem"
components:
  button-primary:
    backgroundColor: "{colors.logo-green}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    padding: "0 28px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.green-deep}"
  button-secondary:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.green-deep}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "52px"
  button-secondary-hover:
    backgroundColor: "{colors.mint}"
  button-on-green:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.green-deep}"
    rounded: "{rounded.pill}"
    padding: "0 28px"
    height: "52px"
  button-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "48px"
  card:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  colour-field:
    backgroundColor: "{colors.logo-green}"
    textColor: "{colors.ground}"
    padding: "{spacing.section-y} {spacing.gutter}"
  chip-sample-data:
    backgroundColor: "{colors.ground-2}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  chip-low-stock:
    backgroundColor: "{colors.amber-wash}"
    textColor: "{colors.amber}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  language-switch:
    backgroundColor: "{colors.ground-2}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    height: "32px"
---

# Design System: Rizq Khata (public marketing pages)

## Overview

**Creative North Star: "The Shop's Own Colours"**

The public pages play the category standard straight and at full craft: a modern product page held to Linear/Stripe precision, with the confident local colour of bKash and Pathao. Logo green is not an accent here; it owns whole fields (the hero phone panel, the repair band, the language tile, the close, the About name band) the way a mobile-money brand owns its colour. Everything else sits on white or a very pale green-grey ground, with slate and near-black ink for text.

The product is shown, not described. Every section carries a working fragment of real UI rendered in code (a phone on the Sell screen, the one-sale ledgers, a repair job card, an offline outbox, a money-out list) and every fragment wears a visible "sample data" label. Bangla is the design target; English is a switch, and both scripts must hold the same hierarchy.

**Scope.** This world governs `/`, `/about`, `/privacy` and `/terms`, all wrapped in `MarketingShell` and scoped by the `.rk` class. The dashboard behind `/login` is Operate mode: it shares only the brand tokens (the `brand-50…900` green scale and the logo files) and keeps its own shadcn/slate system and Tiro Bangla body. Do not carry colour fields, display type, settle motion, phone mocks or marketing shadows into the app; nothing under `.rk` is used by the dashboard.

**Key Characteristics:**
- Logo green owns full-bleed or large rounded colour fields, never just buttons.
- White and pale green-grey grounds; 1px hairline rings instead of borders on cards.
- Anek Bangla (variable) display at weight 650 in both scripts; Inter for Latin body.
- Soft, green-tinted, diffused drop shadows on floating UI only.
- Generous radii (16–28px on UI, up to 40px on colour-field panels), pill buttons.
- Lucide icons at ~1.75 stroke; tabular figures on every amount.
- Values that change settle with a mint wash; they never fade in from nothing.

## Colors

One owned green with its own mint tints, slate ink, and a single amber for stock warnings.

### Primary
- **Logo Green** (logo-green): the brand's own colour. Fills colour fields, primary buttons, step numbers, active states, positive figures and focus outlines. Identical to `brand-700` in the shared scale.
- **Deep Ledger Green** (green-deep): hover for primary buttons, text on white buttons inside green fields, the logo-arrow watermark drawn on green fields.
- **Ledger Ink Green** (green-ink): text on mint surfaces and text selection.

### Secondary
- **Mint** (mint): soft fills for icon tiles, hover on secondary buttons, the "next bill" strip, the apps band and the legal contact box.
- **Mint 2** (mint-2): the settle wash, selection background, avatar fills and the ring on mint surfaces.
- **Leaf** (leaf): hover ring on demo product tiles and the scanner line; never body text.

### Tertiary
- **Stock Amber** (amber) on **Amber Wash** (amber-wash): low-stock and offline-waiting states only. It means "needs attention", nothing decorative.

### Neutral
- **Ink** (ink): headlines and primary text, and the dark "go offline" button.
- **Logo Slate** (slate): secondary text, nav links, list content. Same slate as the logo.
- **Muted** (muted): sub-copy, meta lines, sample-data labels.
- **Hairline** (line): every 1px ring, divider and dashed receipt rule.
- **Ground** (ground) and **Ground 2** (ground-2): page and alternating section backgrounds.
- **Device Black** (device-black): phone bezels only.

### Named Rules
**The Owned Field Rule.** On the selling pages (Home, About) logo green appears as a whole field at least once (hero panel, repair band, About name band, close). A selling page where green is only buttons has lost the world. Legal pages are reading documents: Ground 2 header, green only for links, bullets and the date line.

**The One Green Rule.** The only greens are the logo green family and its mint tints. No other hue competes as a brand colour; stray tints exist only to make sample data look real.

## Typography

**Display Font:** Anek Bangla, variable (with Inter, sans-serif)
**Body Font:** Inter for Latin (with Anek Bangla); in Bangla the whole `.rk` scope switches to Anek Bangla first
**Label/Mono Font:** none distinct; figures use tabular numerals

**Character:** a single variable Bengali-and-Latin family carries every headline at a real 650 weight, so Bangla never relies on synthetic bold; Inter keeps English body text quiet and familiar.

### Hierarchy
- **Display** (650, clamp(2.35rem, 5.4vw, 4.4rem), 1.12): page h1 on Home, About and legal pages; balanced wrapping; tracking -0.025em in Latin, -0.005em in Bangla.
- **Headline** (650, clamp(1.9rem, 3.6vw, 3rem), 1.15): section h2; the close grows to 3.5rem.
- **Title** (650, 1.3–1.45rem, snug): tile, step and legal-section headings.
- **Body** (400, 1.02–1.15rem, 1.75–1.85): sub-copy and legal text, held to ~34–44rem measure.
- **Label** (600, 0.8–0.95rem): panel titles, nav, footer column heads, button text. Sentence case.
- **Figure** (display face, 650, tabular): money and counts in mocks, from 1.1rem to 2.4rem.

### Named Rules
**The Same Weight Rule.** Headlines are Anek Bangla 650 in both languages. Never set a display line in Tiro Bangla or let the browser synthesise bold on the public pages.

**The Exact Taka Rule.** Every amount uses tabular figures and the localised digit set; amounts are never rounded or compacted.

## Layout

A centred 76rem container with 16px gutters (24px from `sm`). Sections stack at 80px vertical padding (112px from `sm`) and alternate white and Ground 2, with green fields running edge to edge. Two-column splits (copy beside a live UI fragment, roughly 1:1.05) collapse to one column below `lg` (1024px). The features area is a six-column bento on `lg` (one money tile spanning 4×2, four tiles spanning 2 or 3). Grids use 16px gaps; cards pad 24px (28px from `sm`). On phones the one-sale ledgers sit above the product grid so a tap and its effect share one screen. Legal pages use a 15rem sticky contents rail beside a 44rem article. The header is sticky at 64px (72px on `lg`).

## Elevation & Depth

A hybrid: surfaces are flat and ringed with 1px hairlines at rest; soft shadows lift only what floats (the phone, the receipt card, the demo counter, the job card on green, the hero CTA, the header once scrolled). Shadows are tinted with deep ledger green, offset downward with negative spread so they pool under the object rather than haloing it. No hard-edged offset shadows.

### Shadow Vocabulary
- **Float** (`0 1px 2px rgba(15,67,50,0.06), 0 12px 32px -12px rgba(15,67,50,0.22)`): floating cards on white (receipt, demo counter).
- **Float Large** (`0 2px 4px rgba(15,67,50,0.06), 0 32px 64px -24px rgba(15,67,50,0.35)`): phone mocks.
- **On Green** (`0 40px 80px -30px rgba(5,30,22,0.6)`): white cards sitting on a green field.
- **CTA Glow** (`0 10px 24px -10px rgba(23,105,76,0.7)`): the hero primary button only.
- **Header Scrolled** (`0 1px 0 #e3e7e5, 0 8px 24px -16px rgba(15,67,50,0.25)`): appears after 8px of scroll.

### Named Rules
**The Ring At Rest Rule.** Cards and tiles at rest get a 1px Hairline ring, not a shadow. A shadow means the thing is floating above the page.

## Shapes

Soft and generous. Pills for every button, chip, nav link and segmented control. UI rows and inner cards round at 16px, demo panels at 20–24px, tiles and job/counter cards at 28px; green colour-field panels and the apps band go to 32–40px, phone bodies to 44px. Icon tiles are 12px squares (or full circles for checks and avatars). Receipts use a dashed Hairline rule between header and lines. One recurring silhouette: the logo's rising-arrow line, drawn large in Deep Ledger Green as a watermark on green fields (hero panel, close).

## Components

### Buttons
Confident pills, always with a visible text label.
- **Shape:** full pill (9999px), 52px tall on hero and close, 40px in the header.
- **Primary:** Logo Green fill, white 600 text, optional trailing arrow that nudges 2px right on hover; hover to Deep Ledger Green; active presses 1px down.
- **Secondary:** white with a Hairline ring and Deep Ledger Green text; hover fills Mint.
- **On green:** white fill with Deep Ledger Green text (hover Mint); its partner is a ghost with a 35% white ring.
- **Dark:** Ink fill for a single in-section action (offline toggle); hover to Slate.
- **Focus:** 2px Logo Green outline at 3px offset; white on green fields.

### Chips
- **Sample data:** Ground 2 pill, Muted 0.7rem text ("sample data" / "নমুনা তথ্য"); on green, 12% white with a 20% white ring.
- **Status:** Amber Wash + Amber for low stock; Mint + Logo Green for "coming soon" and roles; Logo Green fill for the selected branch.

### Cards / Containers
- **Corner Style:** 28px for tiles and cards, 20–24px for data panels, 16px for rows.
- **Background:** white on Ground 2 sections; Ground 2 inside white sections.
- **Shadow Strategy:** Hairline ring at rest; see Elevation for floaters.
- **Internal Padding:** 24–28px for tiles, 14–20px for panels.

### Navigation
Sticky white header: wordmark left, centred pill links in Slate (hover Ground 2 fill, Ink text), then the language switch, Sign in, and the Start free pill. Below `lg` a menu button opens a full-width list with Hairline dividers. The footer has the wordmark with tagline and two short link columns.

### Language Switch
A two-state segmented pill, Bangla first: Ground 2 track with a Hairline ring, the active segment white with Deep Ledger Green text and a hairline shadow. A green-field variant uses a 10% white track.

### One-Sale Demo (signature)
A counter of six product tiles beside four ledger panels (stock, customer, today's takings, khata), each headed by a 28px Mint icon tile with a Logo Green Lucide icon. A tap decrements stock, adds takings, bumps visits and writes the khata line together; every changed value replays a 1.1s Mint 2 background wash (`cubic-bezier(0.16, 1, 0.3, 1)`) and stays fully visible throughout. The active tile gets a Mint fill and a 2px Logo Green ring. A reset control and a sample-data chip sit in the counter header; a polite live region announces the sale. Reduced motion removes the wash.

### Phone Mock
Code-rendered phones (Device Black bezel, 44px outer radius, Ground 2 screen) showing real app screens with labelled sample data. Never a screenshot frame around stock imagery.

## Do's and Don'ts

### Do:
- **Do** give logo green at least one whole field on every selling page, and put white cards on it with the On Green shadow.
- **Do** label every mock with the sample-data chip; mocks show plausible Bangladeshi shop data in taka.
- **Do** set every headline in Anek Bangla 650 and every amount in tabular figures with localised digits.
- **Do** let changed values settle with the Mint 2 wash, and switch it off under reduced motion.
- **Do** use Lucide icons at 1.75 stroke (up to ~2.25 for tiny check and arrow glyphs).
- **Do** keep the dashboard in its own Operate system; share only the brand scale and logo files.

### Don't:
- **Don't** fade, scale or slide values in from invisible; values in a demo are always on screen.
- **Don't** build icon-tile feature grids; a small icon tile may only head a data panel or list row.
- **Don't** invent proof: no customer logos, testimonials, usage counts or named shops.
- **Don't** use hard, unblurred offset shadows or any non-green tinted shadow.
- **Don't** introduce a second brand hue or use indigo; Amber is reserved for attention states.
- **Don't** use stock photography; the product is shown in code-rendered UI.
