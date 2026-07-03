# EasyPG (U9PGs) Design System — Master File

> **LOGIC:** When building a specific page, first check `design-system/easypg/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** EasyPG — PG/hostel management SaaS for the Indian market
**Updated:** 2026-07-03
**Category:** B2B SaaS · Analytics Dashboard
**Design Dials:** Variance 3/10 (Centered / Minimal) | Motion 3/10 (Subtle) | Density 8/10 (Dense / Dashboard)
**Source of truth for tokens:** `src/app/globals.css` — this file documents and extends it; if they ever disagree, `globals.css` wins.

---

## Style Identity

**Style:** Modern SaaS minimalism (Linear/Stripe school)

- Neutral slate base, **one blue accent**, hairline borders, soft small shadows.
- **Light mode only** — intentional. A partial dark theme caused autofill + input artifacts, so dark mode is deliberately not enabled. Do not add `dark:` variants or `prefers-color-scheme` styling.
- Data-dense dashboards: compact spacing, tabular numbers, restrained color — color carries data, text stays in neutral ink.
- Keywords: precise, calm, professional, hairline, recessive chrome, content-first.

**Best-in-class references:** Linear (chrome density), Stripe Dashboard (data display), Mercury (KPI tiles).

---

## Color Palette

All colors are CSS variables registered as Tailwind v4 theme colors in `globals.css`. **Use the semantic Tailwind classes (`bg-primary`, `text-muted-foreground`, `border-border`…) — never raw hex in components.**

| Role | Hex | Token / Class |
|------|-----|---------------|
| Background | `#FFFFFF` | `bg-background` |
| Foreground | `#0F172A` (slate-900) | `text-foreground` |
| Card | `#FFFFFF` | `bg-card` |
| Primary | `#2563EB` (blue-600) | `bg-primary` |
| On Primary | `#FFFFFF` | `text-primary-foreground` |
| Secondary / hover wash | `#F1F5F9` (slate-100) | `bg-secondary` |
| Muted text | `#64748B` (slate-500) | `text-muted-foreground` |
| Accent wash | `#EFF6FF` (blue-50) | `bg-accent` |
| Accent text | `#1D4ED8` (blue-700) | `text-accent-foreground` |
| Destructive | `#DC2626` (red-600) | `bg-destructive` |
| Success | `#059669` (emerald-600) | `bg-success` |
| Border / Input | `#E2E8F0` (slate-200) | `border-border`, `border-input` |
| Focus ring | `#2563EB` | `ring-ring` |

**Rules:**
- One accent. Blue is the only brand color; emerald = success, red = destructive/danger only. No decorative rainbow palettes outside charts.
- Status chips/badges use the tint+ink pattern: `bg-emerald-50 text-emerald-700`, `bg-red-50 text-red-700`, `bg-amber-50 text-amber-700`, `bg-blue-50 text-blue-700`.
- Text contrast ≥ 4.5:1. Muted text is `slate-500` on white — never lighter for body copy.

## Typography

- **Sans (everything):** Inter via `next/font` (`--font-inter`), system-ui fallback stack.
- **Mono (IDs, amounts in tables if needed):** Geist Mono.
- **No display font.** Hierarchy comes from size + weight, not typeface changes.

| Role | Spec |
|------|------|
| Page title | `text-xl md:text-2xl font-semibold tracking-tight` |
| Section heading | `text-base font-semibold` |
| Card/KPI label | `text-xs font-medium text-muted-foreground uppercase tracking-wide` (or sentence-case `text-sm`) |
| KPI value | `text-2xl font-semibold tabular-nums tracking-tight` |
| Body | `text-sm` (14px) — dashboards; `text-base` (16px) minimum for mobile-facing forms |
| Helper/meta | `text-xs text-muted-foreground` |

**Rules:**
- `tabular-nums` on every numeric column, KPI, and timer — no layout shift.
- Line-height 1.5+ for body copy; `tracking-tight` only on headings ≥ 20px.
- Never load Google Fonts via CSS `@import` — fonts go through `next/font`.

## Spacing (Density 8/10 — Dense / Dashboard)

4/8px rhythm, dashboard-compact:

| Token | Value | Usage |
|-------|-------|-------|
| xs | `2px` | Tight inline gaps |
| sm | `4px` | Icon↔label gaps |
| md | `8px` | Standard gaps, chip padding |
| lg | `12px` | Compact card padding, table cell padding |
| xl | `16px` | Card padding (`p-4`), grid gaps |
| 2xl | `24px` | Section margins (`space-y-6`) |
| 3xl | `32px` | Page-level padding on desktop |

- Page container: `max-w-6xl`/`max-w-7xl` centered, `px-4 md:px-6`.
- Card grid: `gap-3` or `gap-4`; KPI rows `grid-cols-2 lg:grid-cols-4`.

## Radius & Shadows

- Radius scale from `--radius: 0.75rem`: `rounded-xl` cards/modals, `rounded-lg` buttons/inputs, `rounded-md` small controls, `rounded-full` pills/avatars.
- Shadows are **soft and small** — hairline borders do the separation work:

| Level | Usage |
|-------|-------|
| `shadow-sm` + `border border-border` | Cards, buttons (default elevation) |
| `shadow-md` | Dropdowns, popovers |
| `shadow-lg`/`shadow-xl` | Modals, sheets only |

- Colored shadows only as brand glow on primary buttons: `shadow-sm shadow-primary/20`.

---

## Component Specs

Components live in `src/components/ui/` — shadcn-style (Radix + `cva` + `cn`). **Extend these; do not hand-roll parallel versions.**

### Buttons (`ui/button.tsx`)
- Variants: `default` (blue), `destructive`, `success`, `outline`, `secondary`, `ghost`, `link`.
- Sizes: `sm` h-9 · `default` h-10 · `lg` h-11 · `xl` h-13 · `icon` 10×10.
- Built-in behavior: `active:scale-[0.98]` press feedback, 150ms transitions, visible focus ring, `disabled:opacity-50`.
- One primary CTA per screen; secondary actions use `outline`/`ghost`.
- Async actions: disable + spinner while pending (`loading-buttons` rule).

### Cards (`ui/card.tsx`)
- `bg-card border border-border rounded-xl shadow-sm`.
- Interactive cards may add `hover:shadow-md transition-shadow` — **no translateY hovers on dense grids** (layout jitter).
- `cursor-pointer` only when the whole card is clickable.

### Inputs
- `h-10 rounded-lg border border-input text-base` (16px on mobile — prevents iOS zoom).
- Focus handled globally in `globals.css` (2px ring, offset 2).
- Always a visible `<label>`; errors `text-xs text-destructive` directly below the field; validate on blur.
- Semantic types (`email`, `tel`, `number`) + `autocomplete` attributes.

### Modals / Sheets (`ui/sheet.tsx`, popover)
- Overlay: `bg-black/50` (+ optional `backdrop-blur-sm`), content `rounded-xl shadow-xl p-6`.
- Mobile: bottom sheet with swipe/close affordance; always a visible close button; confirm before dismissing unsaved changes.

### Feedback primitives
- `ui/skeleton.tsx` for loading >300ms (skeleton over spinner), `ui/empty-state.tsx` for zero-data (message + action), `ui/badge.tsx` for status chips, `ui/progress.tsx` for occupancy/progress.
- Confirmation dialog before destructive actions; destructive buttons visually separated.

### Icons
- **Lucide (`lucide-react`) only.** `size-4` inline in buttons, `size-5` nav, consistent 2px stroke. Never emoji as icons.
- Icon-only buttons require `aria-label`.

---

## Charts (analytics convention)

Charts are **dependency-free SVG** in `src/components/analytics/charts.tsx`, built to the house dataviz method:

- Thin 2px marks, rounded data-ends, recessive hairline grid (`#EEF0F3`), axis ink `#94A3B8`.
- **Single accent `#2A78D6`** carries the data; text stays neutral ink. Multi-series only when necessary, with distinct non-red/green-only hues.
- Hover layer by default: crosshair + tooltip on trends, per-bar tooltips on bars — exact values via `formatCurrency`/`formatCompactCurrency`.
- "Nice" axis maxima (rounded to magnitude) so ticks read cleanly.
- Empty data → `EmptyState` with guidance, never a blank axis frame. Loading → skeleton shimmer.
- Chart type: trend → area/line · comparison → bar · proportion → donut (≤5 slices, otherwise bars).
- Numbers/dates locale-aware via `src/lib/format.ts` (INR, lakh/crore compaction: ₹1.2L / ₹3.4Cr).

## i18n & Formatting

- Custom translation layer: `useTranslation()` hook (`src/hooks/useTranslation.ts`) over `src/lib/translations.ts`; languages `en`/`te`, persisted in `localStorage` (`u9pgs_lang`).
- **No hardcoded user-facing strings** — everything through `t`.
- All currency/number/percent/date formatting through `src/lib/format.ts` (Indian digit grouping, `en-IN`/`te-IN`/`hi-IN` locales). Never `toLocaleString()` inline.

---

## Motion (3/10 — Subtle)

`framer-motion` is available; most interactions use CSS transitions.

- Micro-interactions 150–200ms; entrances ≤300ms; exits ~60–70% of enter duration.
- Ease-out entering, ease-in exiting; `transform`/`opacity` only — never animate width/height/top/left.
- Button press feedback via `active:scale-[0.98]` (already in `ui/button.tsx`).
- List/grid entrance stagger 30–50ms per item, only on first mount.
- Respect `prefers-reduced-motion` — gate any framer-motion choreography behind it.
- No page-transition choreography; route changes stay instant (dashboard, not marketing site).

---

## Layout & Navigation

- Mobile-first; breakpoints 375 / 768 / 1024 / 1440. `min-h-dvh` over `100vh`.
- Mobile: `BottomNav.tsx` bottom navigation (≤5 items, icon + label, active state highlighted). Desktop ≥1024px: sidebar.
- Fixed bars reserve content padding — nothing hidden behind navbar/bottom nav; respect safe areas (`pb-[env(safe-area-inset-bottom)]`).
- Page shell: `ui/page-header.tsx` for title + actions; consistent placement on every page.
- Touch targets ≥ 44×44px, ≥8px apart. No horizontal page scroll; wide tables scroll inside their own `overflow-x-auto` container.

---

## Anti-Patterns (Do NOT Use)

- ❌ Dark mode / `dark:` variants (intentionally disabled — see `globals.css` header)
- ❌ Raw hex colors in components — semantic tokens only (charts' dataviz constants are the exception)
- ❌ Emojis as icons — Lucide SVG only
- ❌ New font families or CSS `@import` fonts
- ❌ Second brand accent color; ornate/gradient-heavy decoration
- ❌ Layout-shifting hovers (translateY on dense grids), animating width/height
- ❌ Placeholder-only labels; errors only at top of form
- ❌ Hardcoded user-facing strings (bypassing `useTranslation`) or inline `toLocaleString()`
- ❌ Removing focus rings; icon-only buttons without `aria-label`
- ❌ Instant state changes (0ms) or >400ms transitions
- ❌ Unfilterable/unsortable long data tables — dense data needs filtering

---

## Pre-Delivery Checklist

- [ ] Semantic tokens only (`bg-primary` etc.), no raw hex
- [ ] All strings through `t`, all numbers through `lib/format.ts`
- [ ] `tabular-nums` on numeric columns/KPIs
- [ ] Icons: Lucide, consistent size, `aria-label` on icon-only buttons
- [ ] Loading: skeleton >300ms; empty: `EmptyState` with action; error: message + retry
- [ ] Buttons disabled + spinner during async submits
- [ ] Text contrast ≥ 4.5:1; visible focus states; keyboard navigable
- [ ] Touch targets ≥ 44px; 16px input text on mobile
- [ ] `prefers-reduced-motion` respected
- [ ] Tested at 375px / 768px / 1024px / 1440px; no horizontal scroll
- [ ] No content hidden behind BottomNav / fixed headers (safe-area padding)
