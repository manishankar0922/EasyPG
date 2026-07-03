# Page Override: Superadmin Panel (`/superadmin/*`)

> Overrides MASTER.md for all superadmin routes. Everything not listed here follows MASTER.md.

## Theme: Dark "Command Center" — intentional exception

The tenant-facing app is light-only; the superadmin panel is **deliberately dark** to signal a different operating context (platform operator vs. PG owner). Keep it dark — do not "fix" it to light.

| Role | Value |
|------|-------|
| Background | `bg-slate-950` |
| Surface / card | `bg-slate-900` with `border-slate-800` |
| Foreground | `text-slate-100`; muted `text-slate-400` (≥3:1), body ≥4.5:1 |
| Primary accent | blue kept, but use lighter tints for text on dark (`text-blue-400`) |
| Status tints | dark-mode pattern: `bg-emerald-500/10 text-emerald-400`, `bg-red-500/10 text-red-400`, `bg-amber-500/10 text-amber-400` |

## Rules

- Contrast is verified against dark surfaces independently — don't reuse light-mode slate-500 text on slate-950.
- Hairline separation via `border-slate-800`; shadows are nearly invisible on dark — borders do the work.
- Charts on dark: grid `slate-800`, axis ink `slate-500`, same single-accent discipline (use a lighter accent, e.g. blue-400, for legibility).
- Focus rings must remain visible on dark (`ring-blue-500` reads fine on slate-950).
- SaaS metrics (MRR, subscription health, pending approvals) follow the same KPI-tile conventions as MASTER.md (tabular-nums, compact INR formatting).
- This dark theme is scoped to `/superadmin/*` only — never let it leak into shared `ui/` components via global styles.
