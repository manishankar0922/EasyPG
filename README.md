# EasyPG — Enterprise Multi-Tenant Hostel & PG Operations Intelligence SaaS

![Version](https://img.shields.io/badge/version-v1.1--production-blue.svg)
![Stack](https://img.shields.io/badge/Next.js%2015%20%7C%20Express.js%20%7C%20PostgreSQL%20%7C%20BullMQ-success.svg)
![Architecture](https://img.shields.io/badge/architecture-Multi--Tenant%20%2F%20Hierarchical-orange.svg)
![Security](https://img.shields.io/badge/security-OWASP%20Hardened%20%7C%20Rate--Limited%20%7C%20Audit--Logged-brightgreen.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)

> **EasyPG** is a production-grade, multi-tenant SaaS application built to digitize, automate, and scale PG (Paying Guest) and Hostel business operations. EasyPG solves complex operational challenges around multi-branch property management, real-time occupancy heatmaps, automated monthly rent ledgers, predictive vacancy tracking, and digital financial accountability.

---

## 🎯 Executive Summary & Problem Statement

### Real-World Industry Problem
Hostel and PG businesses across India and emerging markets manage thousands of tenants using fragmented, manual tools (paper logbooks, Excel spreadsheets, WhatsApp messages). This introduces critical bottlenecks:

1. **Financial Leakage & Human Accounting Errors**: Manual ledger updates lead to missing payments, uncollected dues, and lost security deposit tracking.
2. **Multi-Branch Blindspots**: Business owners operating multiple locations lack real-time visibility into overall financial health, expected revenue vs. collected cash, and warden performance.
3. **Revenue Losses via Unfilled Vacancies**: Wardens frequently fail to log advance 30-day vacate notices, causing rooms to sit empty between tenant stays.
4. **Security & Data Isolation Risks**: Unrestricted staff access leads to customer PII leaks, unauthorized discount grants, and double-booking of beds.

### The EasyPG Solution
EasyPG delivers an enterprise-grade **Operational Intelligence Platform**:
* **Hierarchical Multi-Tenancy**: Complete data isolation between business organizations and physical branches.
* **Automated Monthly Rent Engine**: Distributed background jobs (BullMQ + Redis) automatically generate monthly dues on the 1st of every month with carry-forward balances.
* **2D Occupancy Heatmap & Predictive Vacancy**: Visual room grid highlighting active beds, vacant capacity, and upcoming 30-day vacate notices.
* **Hardened Security Architecture**: Defense-in-depth API design with constant-time password checks, timing-attack mitigation, account lockout, rate limiting, and PII masking.

---

## 🏛️ System Architecture & Multi-Tenant Model

EasyPG implements a strict hierarchical entity model ensuring clean multi-tenancy, zero cross-tenant data leakage, and role-based access control across all API endpoints:

```mermaid
graph TD
    SA[SuperAdmin Console] -->|Global System Governance| ORG1[Organization 1: Urban Living]
    SA -->|Subscription Approval & Limits| ORG2[Organization 2: Prime Hostels]

    ORG1 -->|Owner Access| B1[Branch 1: HSR Layout]
    ORG1 -->|Owner Access| B2[Branch 2: Koramangala]

    B1 -->|Warden Access| R1[Rooms / Floors]
    B1 -->|Warden Access| T1[Tenants & Admissions]

    R1 --> BEDS[Beds: Atomic Unit A, B, C]
    BEDS -->|Assigned To| T1
```

### Role-Based Access Control (RBAC) Matrix
| Role | Access Scope | Technical Boundaries & Protections |
| :--- | :--- | :--- |
| **SuperAdmin** | Global Platform | Full cross-organization control, subscription plan upgrades/approvals, global platform analytics, org deletion/suspension. |
| **Owner** | Organization-wide | Multi-branch P&L reports, overall expected vs collected revenue, branch setup, warden creation, tenant master directory. |
| **Warden** | Branch-restricted | Scoped exclusively to assigned `branchId`. Manages tenant admissions, bed assignments, payment collections, and vacate notices. |
| **Tenant** | Profile-scoped | Self-service tenant app: view rent ledgers, active bed details, payment receipts, and lodge complaints. |

---

## 💡 Engineering Highlights & Code Quality Standards

This project was built adhering to senior engineering practices, defensive programming, and security-first principles:

### 1. 🛡️ OWASP-Hardened Authentication & API Security
* **Timing-Attack Prevention**: When a login fails due to an invalid phone number, the backend injects a synthetic `200ms` delay to match `bcrypt` hash execution time. This prevents malicious actors from enumerating valid phone numbers via side-channel timing analysis.
* **Constant-Time PIN Comparison**: Uses `crypto.timingSafeEqual()` for tenant PIN verification to prevent byte-by-byte timing attacks.
* **Strict Payload Validation**: All routes use **Zod** schemas with `.strict()` enabled, rejecting unrecognized parameter injections (protecting against OWASP API3: Mass Assignment).
* **JWT Fingerprinting**: JWT payloads include a SHA-256 hash of the client's `User-Agent` fingerprint along with standard `iss` (issuer) and `aud` (audience) claims, mitigating session hijacking.
* **Account Lockout Middleware**: Tracks consecutive failed login attempts in Redis and issues an `HTTP 423 Locked` response after 5 consecutive failures.

### 2. ⚡ Database Performance & Query Optimization
* **Indexing Strategy**: Strategic `B-Tree` indexes on foreign keys (`organizationId`, `branchId`, `tenantId`, `roomId`) and status flags (`status`, `vacateDate`) eliminate sequential table scans.
* **N+1 Query Elimination**: Complex queries like the **Room Heatmap** use explicit Prisma `include` blocks and field projections (`select`), fetching entire branch floorplans in a single optimized database roundtrip.
* **Composite Constraints**: Unique constraints like `@@unique([tenantId, month, year])` on `RentLedger` guarantee idempotency for automated rent generation.

### 3. 🔄 Distributed Background Processing (BullMQ + Redis)
* **Automated Monthly Rent Generation**: Offloaded from the web server thread to dedicated background workers (`generateMonthlyRent.ts`).
* **Fault-Tolerant Retries**: Failed job queues automatically retry with exponential backoff and log failures to audit logs.
* **Graceful Degradation**: If Redis is offline in local development, the backend automatically falls back to an in-memory rate-limiter and queue store without crashing.

---

## 🔁 Key System Workflows

### 1. Tenant Login & Security Verification Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Tenant
    participant API as Express API /tenant-auth
    participant Lock as Lockout Middleware
    participant DB as PostgreSQL (Prisma)
    participant Auth as JWT Engine

    Tenant->>API: POST /login { phone, password }
    API->>Lock: Check IP & Phone Lockout Status
    alt Account Locked (5+ Failed Attempts)
        Lock-->>Tenant: HTTP 423 Locked (Retry after 15m)
    end
    API->>DB: Query Tenant by Phone (Indexed B-Tree)
    alt Tenant Not Found
        API->>API: Synthetic Delay (200ms)
        API-->>Tenant: HTTP 401 Invalid Credentials
    end
    API->>API: Constant-Time PIN Compare (crypto.timingSafeEqual)
    alt Password Invalid
        API->>Lock: Record Failed Attempt
        API-->>Tenant: HTTP 401 Invalid Credentials
    end
    API->>Auth: Sign JWT with Fingerprint & Issuer Claims
    Auth-->>Tenant: HTTP 200 OK { token, session }
```

### 2. Automated Monthly Rent Generation Engine

```mermaid
sequenceDiagram
    autonumber
    participant Cron as BullMQ Scheduler (1st of Month)
    participant Worker as Background Worker
    participant DB as PostgreSQL
    participant WhatsApp as WhatsApp Notification Engine

    Cron->>Worker: Trigger `generateMonthlyRent` Job
    Worker->>DB: Fetch All ACTIVE Tenants across Orgs
    loop For Each Active Tenant
        Worker->>DB: Check Last Month's Ledger (Carry-Forward Balance)
        Worker->>DB: Calculate Total Dues = (Current Rent + Previous Balance)
        Worker->>DB: Upsert `RentLedger` (Unique Constraint: tenantId+month+year)
        Worker->>WhatsApp: Enqueue Payment Due Notification
    end
    Worker-->>Cron: Job Complete (Logged in SystemLog)
```

---

## 🗄️ Database Schema Overview & ERD

The relational schema is built with PostgreSQL using Prisma ORM. Key database models and relationships include:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Organization   │1     *│     Branch      │1     *│      Room       │
├─────────────────┤───────├─────────────────┤───────├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ name            │       │ organization_id │       │ branch_id (FK)  │
│ owner_phone     │       │ name            │       │ room_number     │
└─────────────────┘       └─────────────────┘       │ rent_amount     │
         │                                          └────────┬────────┘
         │1                                                  │1
         │                                                   │
         │*                                                  │*
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     Tenant      │1     *│    Admission    │*     1│       Bed       │
├─────────────────┤───────├─────────────────┤───────├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ organization_id │       │ tenant_id (FK)  │       │ room_id (FK)    │
│ phone (Indexed) │       │ bed_id (FK)     │       │ bed_number      │
│ aadhaar_last4   │       │ monthly_rent    │       │ is_occupied     │
└────────┬────────┘       └─────────────────┘       └─────────────────┘
         │1
         │
         │*
┌─────────────────┐
│   RentLedger    │
├─────────────────┤
│ id (PK)         │
│ tenant_id (FK)  │
│ month, year     │
│ expected_rent   │
│ balance_last    │
│ total_due       │
│ status (Enum)   │
└─────────────────┘
```

### Critical Database Indexes
* `@@index([organizationId])` on `User`, `Branch`, `Room`, `Tenant`, `Admission`, `Complaint`.
* `@@index([branchId])` on `User`, `Room`, `Tenant`.
* `@@index([status])` on `Tenant`, `VacateNotice`, `RentLedger`, `PaymentRequest`.
* `@@unique([tenantId, month, year])` on `RentLedger` (prevents double-billing).

---

## 🔑 Demo Access Credentials

To test the application locally or run automated tests, use these pre-configured seed accounts:

```bash
cd backend
npx prisma db seed
```

| Role | Email / Phone | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Warden (Org 1, Branch 1)** | `warden1@org1branch1.com` | `u9pgs123` | Branch 1 Operations |
| **Warden (Org 2, Branch 1)** | `warden1@org2branch1.com` | `u9pgs123` | Branch 2 Operations |

---

## 🛠️ Technical Stack Matrix

| Layer | Technology | Engineering Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 15 (App Router, Turbopack) | Server-side rendering, fast INP, optimized client bundles. |
| **UI Component Architecture** | React 19, Tailwind CSS, Lucide Icons | Responsive, glassmorphic UI with zero runtime CSS overhead. |
| **Client State Management** | Zustand | Lightweight global state store for auth & active branch selection. |
| **Backend Runtime** | Node.js, Express.js (TypeScript) | Strongly typed REST API layer with custom Express middleware pipeline. |
| **Database & ORM** | PostgreSQL (Supabase) + Prisma ORM | Type-safe SQL queries, migration control, PgBouncer pool management. |
| **Async Queues & Cache** | Redis 7 + BullMQ | Background job execution for automated rent ledgers & rate limiting. |
| **Media Storage** | Cloudinary | Backend-signed signature uploads for tenant KYC & receipts. |
| **Deployment** | Vercel (Frontend) + Render (Backend) | Production cloud deployment pipeline with healthcheck monitoring. |

---

## 🚀 Local Installation & Setup Guide

### 1. Prerequisites
* **Node.js**: `v20.x` or higher
* **npm**: `v10.x` or higher
* **PostgreSQL**: Local PostgreSQL instance or a free [Supabase](https://supabase.com) project
* **Redis** *(Optional)*: Local Redis server (Backend falls back to in-memory store if Redis is unavailable).

### 2. Repository Cloning & Dependency Installation
```bash
git clone https://github.com/manishankar0922/EasyPG.git
cd EasyPG
npm install
```

### 3. Environment Variables Configuration

**Backend Environment Setup (`backend/.env`):**
```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/easypg?schema=public"
DIRECT_URL="postgresql://postgres:password@localhost:5432/easypg?schema=public"
JWT_SECRET="your_development_jwt_secret_here"
REDIS_URL="redis://localhost:6379"

# Optional Cloudinary Integration
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

**Frontend Environment Setup (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
```

### 4. Database Migration & Seeding
```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
```

### 5. Running the Application
Run both frontend and backend concurrently from the root directory:
```bash
npm run dev
```

* **Frontend App**: `http://localhost:3000`
* **Backend REST API**: `http://localhost:3001/api/v1`
* **Interactive API Docs**: `http://localhost:3001/api/v1/docs`

---

## 📡 API Endpoint Directory

### Authentication (`/api/v1/auth`, `/api/v1/tenant-auth`)
* `POST /api/v1/auth/login` — Staff/Owner login (returns JWT & role)
* `POST /api/v1/tenant-auth/login` — Tenant login (Phone + Aadhaar PIN, rate-limited & locked)
* `GET  /api/v1/auth/me` — Retrieve current authenticated session profile

### Branch & Organization Management (`/api/v1/branches`)
* `GET  /api/v1/branches` — List all active branches under organization
* `POST /api/v1/branches` — Create a new branch (Owner only)

### Room Occupancy Heatmap (`/api/v1/rooms`)
* `GET  /api/v1/rooms/heatmap` — Real-time room grid & bed status breakdown
* `POST /api/v1/rooms` — Create room with floor & bed allocations

### Tenant Admissions & Management (`/api/v1/tenants`, `/api/v1/admissions`)
* `POST /api/v1/admissions` — Check-in tenant & assign bed
* `GET  /api/v1/tenants` — Tenant directory with filter parameters (Active, Overdue, Vacated)

### Rent Ledgers & Financial Operations (`/api/v1/rent-ledgers`, `/api/v1/payments`)
* `GET  /api/v1/rent-ledgers` — Monthly rent ledger records
* `POST /api/v1/payments` — Record cash/UPI payment & trigger WhatsApp receipt

---

## 🧪 Testing & Verification Suite

The repository includes verification scripts to test database operations, authentication flows, and API route security:

```bash
# Run database write-persistence check
cd backend
npx ts-node src/test/scratch_db_check.ts

# Run auth route tests
node test-auth.js
```

---

## 👨‍💻 Project Maintainer & Acknowledgments

Designed, engineered, and maintained by **[@manishankar0922](https://github.com/manishankar0922)**.
