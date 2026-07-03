# 🔒 Security Audit — U9PGs Multi-Tenant SaaS

**Repository:** EasyPG (Next.js + Express + Prisma + JWT/RBAC)
**Auditor:** Claude Code (senior security auditor)
**Date:** 2026-07-03
**Scope:** Express + Prisma backend, JWT/RBAC auth, `organizationId`/`branchId` multi-tenancy.

---

## Executive Summary

Tenant-scoping discipline is genuinely **strong** across most routes — invoices, payments, tenants, rooms, branches, and complaints all filter by `organizationId` plus branch, and destructive operations use scoped `deleteMany`/`updateMany`. The serious issues are concentrated in **authentication design** and a **mass-assignment privilege escalation**, not classic IDOR.

**Fix first:** Findings #1, #2, #3 — each is independently exploitable by a low-privilege or unauthenticated actor.

| Area | Verdict |
|---|---|
| **Multi-tenancy / IDOR** | ✅ Strong — every data route checks `organizationId`; deletes/updates use scoped filters. Main gap: branch isolation fails *open* on null `branchId` (#8). |
| **Authentication** | ❌ Weakest area — derivable tenant PIN (#1), disabled brute-force limits (#3), logout/token-lifetime mismatch (#4), un-revocable 30d tenant tokens (#5). |
| **Authorization / RBAC** | ❌ Mass-assignment self-escalation to OWNER (#2); fragile superadmin role list (#10). |
| **OWASP / headers / secrets** | ✅ Helmet, HPP, prototype-pollution guard, no hardcoded secrets, JWT from env, Swagger/metrics gated. ⚠️ CORS `startsWith` bypass (#7). |
| **Input validation** | ✅ Mostly Zod `.strict()`; gap at rent-ledger pay (#9). No raw SQL injection surface (Prisma parameterized). |

---

## Findings

### 🔴 HIGH — #1 Tenant password derivable from the phone number
- **File:** `backend/src/routes/tenant-auth.routes.ts:78-82`
- **Vulnerability:** Tenant password is a 4-digit PIN (`aadhaarLast4`), and when that's empty it **falls back to the last 4 digits of the tenant's own phone number** (`tenant?.phone.slice(-4)`). Comparison is plaintext, no hashing.
- **Exploit:** An attacker who knows a tenant's phone number (printed on receipts, WhatsApp, shared freely) logs in as them by submitting the last 4 digits of that same phone number — the "password" is derivable from the "username." Even with Aadhaar-last-4 the keyspace is only 10,000 and numeric. Grants access to the tenant portal for any tenant in any org.

### 🔴 HIGH — #2 Privilege escalation via mass assignment on user update
- **File:** `backend/src/routes/user.routes.ts:199-210` + `backend/src/schemas/profile.schema.ts:22`
- **Vulnerability:** `PATCH /users/:id` runs `data: req.body`, the auth check permits a user to edit **themselves** (`currentUserId === targetId`), and `updateProfileSchema` includes `role: RoleEnum.optional()` (`OWNER`/`WARDEN`/`STAFF`).
- **Exploit:** A WARDEN or STAFF calls `PATCH /api/v1/users/<their-own-id>` with `{ "role": "OWNER" }`. `updateMany({ where: { id, organizationId }, data: req.body })` writes it. They are now OWNER — full org access: cross-branch data, delete users, reset passwords, org settings. `status`/`branchId` are equally injectable.

### 🔴 HIGH — #3 Brute-force protection effectively disabled on login
- **File:** `backend/src/middlewares/rateLimiter.ts:88-104`
- **Vulnerability:** `authLimiter` and `tenantAuthLimiter` are set to `max: 500` per 15 min ("Increased drastically") while their own docstrings claim 5. The only real gate is the per-account lockout.
- **Exploit:** 500 attempts / 15 min / IP against `/tenant-auth/login` (10,000-key PIN space, finding #1). Distributed across a handful of IPs, a target account's PIN is brute-forced well within a day. The comment/behavior mismatch suggests the control was intended to be 5.

### 🟠 MEDIUM — #4 Rate-limit bypass via spoofed X-Forwarded-For
- **File:** `backend/src/middlewares/rateLimiter.ts:60-67`
- **Vulnerability:** `userAwareKeyGenerator` builds the rate-limit key from `req.headers['x-forwarded-for'].split(',')[0]` — the **leftmost, client-supplied** XFF value (not the proxy-trusted `req.ip`).
- **Exploit:** Attacker sends a random `X-Forwarded-For: <uuid>` header on each request. Every request gets a fresh bucket, fully bypassing `userAwareLimiter` and `superadminWriteLimiter` (dashboard, rent-ledger, complaints, superadmin writes).

### 🟠 MEDIUM — #5 Logout blacklist TTL shorter than token lifetime
- **File:** `backend/src/routes/auth.routes.ts:365`
- **Vulnerability:** Logout blacklists the JWT in Redis for **24h** (`'EX', 60*60*24`), but user tokens live **7d** and tenant tokens **30d**.
- **Exploit:** A token captured before logout (XSS, shared device, proxy log) is rejected for 24h, then the blacklist entry expires and the still-valid token works again for the remaining 6+ days. Blacklist TTL must equal the token's remaining lifetime.

### 🟠 MEDIUM — #6 Tenant tokens are long-lived and un-revocable
- **File:** `backend/src/routes/tenant-portal.routes.ts:8-31` + `backend/src/routes/tenant-auth.routes.ts:155`
- **Vulnerability:** Tenant tokens are issued for **30 days** and `requireTenantAuth` trusts the decoded token wholesale (`req.user = decoded`) — no DB re-check that the tenant still exists/is `ACTIVE`, no `tokenVersion`, no Redis blacklist check.
- **Exploit:** A tenant who is vacated/deactivated (or whose token is stolen) retains portal access for up to 30 days with no way to revoke. Unlike the staff `requireAuth`, there is no server-side kill switch.

### 🟠 MEDIUM — #7 CORS allow-list bypass via unanchored `startsWith`
- **File:** `backend/src/index.ts:105-108`
- **Vulnerability:** CORS origin allow-list uses `originHost.startsWith('admin-' + frontendHost)` (and `dev-`, `tenant-`, `tenet-`). `startsWith` does not anchor the end of the hostname.
- **Exploit:** With `FRONTEND_URL` host `frontend-x.vercel.app`, an origin `admin-frontend-x.vercel.app.attacker.com` satisfies `startsWith('admin-frontend-x.vercel.app')` and is granted `Access-Control-Allow-Credentials: true`. Impact is bounded because auth is Bearer-header (not cookies), but it is a credentialed-CORS misconfig and a foot-gun if cookies are ever added. Use `===` / `.endsWith('.' + host)`.

### 🟠 MEDIUM — #8 Branch isolation fails open on null `branchId`
- **Files (pattern):** `admission.routes.ts:19`, `invoice.routes.ts:25`, `payment.routes.ts:265`, `tenant.routes.ts:129,156,208`
- **Vulnerability:** Branch isolation is gated on `role !== 'OWNER' && role !== 'SUPER_ADMIN' && userBranchId`. If a WARDEN/STAFF has a **null `branchId`**, the branch filter is silently omitted — they see the entire organization.
- **Exploit:** A warden created/left without a branch assignment (common during onboarding, or after `assign-branch` sets it null) escalates from single-branch to org-wide visibility across tenants, invoices, payments, and admissions. Isolation should fail **closed** (deny) when `branchId` is missing.
- **Affects:** admissions, invoices, payments, tenants (search/get/history), rooms list.

### 🟠 MEDIUM — #9 No input validation on rent-ledger payment
- **File:** `backend/src/routes/rent-ledger.routes.ts:11,28`
- **Vulnerability:** `PATCH /:ledgerId/pay` has **no Zod validation**. `amount` is taken raw from `req.body` and used in `ledger.paidAmount + amount`. (Org scoping itself is correct here.)
- **Exploit:** Client sends `{ "amount": -50000 }` (or a string causing concatenation / `NaN`) to corrupt paid totals and force a `PAID`/`PARTIAL` status on an unpaid ledger, or poison financial records. No bounds check exists (unlike the payment route's `.min(1).max(500000)`).

### 🟡 LOW/MEDIUM — #10 Fragile superadmin role allow-list
- **File:** `backend/src/routes/admin.routes.ts:15-21`
- **Vulnerability:** `requireSuperAdmin` accepts `['SUPER_ADMIN', 'SUPERADMIN', 'superadmin', 'admin', 'ADMIN']`. Only `SUPERADMIN` exists in the Prisma `Role` enum; the rest are dead strings today.
- **Exploit:** Not currently exploitable, but it's a latent escalation trap: the moment an `admin`/`ADMIN` role or case-variant is added anywhere (or an impersonation token sets a lowercase role), those principals gain the entire superadmin surface (impersonate any org, delete orgs, edit subscriptions). Match exactly one canonical role.

### 🟡 LOW — #11 Impersonation token missing standard claims
- **File:** `backend/src/routes/admin.routes.ts:40-70`
- **Vulnerability:** `POST /organizations/:id/impersonate` mints a JWT with `{ id, role, organizationId }` — no `userId`, no `issuer`/`audience`, no `fingerprint`, no `tokenVersion`. (SUPERADMIN-gated, so low severity.)
- **Exploit:** Beyond being functionally broken against `requireAuth` (which requires `iss`/`aud` and reads `decoded.userId`), impersonation tokens are un-revocable and un-fingerprinted. If ever consumed by a looser verifier (like `requireTenantAuth`, which skips `iss`/`aud`), they become long-lived un-auditable tokens. Align issuance with the standard token claims.

### 🟡 LOW — #12 Cloudinary upload signature lacks size cap
- **File:** `backend/src/routes/upload.routes.ts:27-59`
- **Vulnerability:** The signature endpoint signs a client-supplied `folder` and returns `apiKey`, but the signed params enforce only `allowed_formats` — no `max_bytes`/`bytes` limit and no per-object size cap. The server body limit (`2mb`) doesn't apply since uploads go direct-to-Cloudinary.
- **Exploit:** An authenticated user obtains a signature and uploads arbitrarily large files (within their format allow-list) straight to Cloudinary, driving storage/bandwidth cost (resource-consumption abuse). Add a signed size constraint and consider pinning `resource_type`.

---

## Recommended Remediation Order

1. **#1** — Replace tenant PIN auth with a hashed, non-derivable secret (or OTP); at minimum drop the phone-last-4 fallback.
2. **#2** — Strip `role`/`status`/`organizationId`/`branchId` from `updateProfileSchema` for self-updates; whitelist assignable fields; never pass `data: req.body`.
3. **#3** — Restore `authLimiter`/`tenantAuthLimiter` to a strict value (e.g. 5–10 / 15 min).
4. **#4** — Key rate limiters off `req.ip` (with correct `trust proxy`), not raw XFF.
5. **#5 / #6** — Match blacklist TTL to token lifetime; add tenant revocation (`tokenVersion` + active check + blacklist) in `requireTenantAuth`.
6. **#7** — Replace `startsWith` origin checks with exact/`endsWith('.'+host)` matching.
7. **#8** — Make branch isolation fail closed when `branchId` is null.
8. **#9** — Add a Zod schema (`amount` positive, bounded) to the rent-ledger pay route.
9. **#10–#12** — Canonicalize the superadmin role check, align impersonation claims, add a signed upload size cap.

---

## Suggested Verification

- **#2:** Confirm a WARDEN can reach `PATCH /users/:id` and flip their own role to `OWNER`.
- **#1:** Confirm `tenant.phone.slice(-4)` login succeeds on a seeded tenant with empty `aadhaarLast4`.
