# EasyPG — Multi-Tenant Hostel & PG Operations Intelligence SaaS

![Version](https://img.shields.io/badge/version-v1.1--production-blue.svg)
![Stack](https://img.shields.io/badge/Next.js%2015%20%7C%20Express.js%20%7C%20PostgreSQL%20%7C%20BullMQ-success.svg)
![Architecture](https://img.shields.io/badge/architecture-Multi--Tenant%20%2F%20Hierarchical-orange.svg)
![Security](https://img.shields.io/badge/security-RBAC%20%7C%20Rate--Limited%20%7C%20Audit--Logged-brightgreen.svg)

**EasyPG** is a high-performance, multi-tenant SaaS application designed to digitize and automate end-to-end PG (Paying Guest) and Hostel operations. Built for multi-property business owners, property managers (wardens), and super-administrators, EasyPG eliminates manual register entry, automates monthly rent ledgers, provides real-time room occupancy heatmaps, and delivers actionable financial intelligence.

---

## 📌 Executive Summary & Problem Statement

### The Problem
Traditional PG and hostel operations in India and emerging markets suffer from severe operational inefficiencies:
1. **Manual Registers & Paper Records**: Rent collections, deposits, and tenant check-ins are logged manually, leading to lost receipts, human accounting errors, and financial leakages.
2. **Lack of Multi-Branch Visibility**: Property owners operating 3 to 10+ branches lack real-time visibility into overall financial health, expected vs. collected rent, and overdue balances.
3. **Revenue Loss via Untracked Vacancies**: Wardens frequently fail to log advance vacate notices, causing rooms to sit empty for weeks between tenant stays.
4. **Tenant Communication Bottlenecks**: Manual rent reminders and paper payment receipts create trust issues and delays.

### The EasyPG Solution
EasyPG replaces manual registers with a centralized **Operational Intelligence Platform**:
* **Hierarchical Multi-Tenancy**: Complete data isolation between business organizations and physical branches.
* **Automated Rent Ledger Engine**: Scheduled background jobs generate monthly rent dues on the 1st of every month with automatic carry-forward balances.
* **2D Occupancy Heatmap & Predictive Vacancy**: Visual room grid highlighting active beds, vacant capacity, and upcoming 30-day vacate notices.
* **Instant Digital Accountability**: Automated WhatsApp receipt generation and clear P&L dashboards for owners.

---

## 🏗️ System Architecture & Multi-Tenant Model

EasyPG implements a strict hierarchical entity model ensuring clean multi-tenancy and data isolation across all API endpoints and UI components:

```mermaid
graph TD
    SA[SuperAdmin Console] -->|Global Governance & Subscription Approval| ORG1[Organization 1: Urban Living]
    SA -->|Global Governance & Subscription Approval| ORG2[Organization 2: Prime Hostels]

    ORG1 -->|Owner Access| B1[Branch 1: HSR Layout]
    ORG1 -->|Owner Access| B2[Branch 2: Koramangala]

    B1 -->|Warden Access| R1[Rooms / Floors]
    B1 -->|Warden Access| T1[Tenants & Admissions]

    R1 --> BEDS[Beds: Atomic Unit]
    BEDS -->|Assigned To| T1
```

### Data Isolation & Access Hierarchy
| Role | Access Scope | Key Capabilities |
| :--- | :--- | :--- |
| **SuperAdmin** | Global Platform | Cross-organization analytics, manual SaaS subscription approval/rejection, plan limits enforcement, org deletion/suspension. |
| **Owner** | Organization-wide | Multi-branch P&L dashboard, total expected/collected revenue analytics, branch creation, warden assignment, tenant records. |
| **Warden** | Branch-restricted | Daily branch operations: tenant check-in/out, bed allocation, cash/UPI collection, logging vacate notices, complaint management. |
| **Tenant** | Profile-scoped | Self-service portal: view rent ledgers, active bed details, payment receipts, and lodge complaints. |

---

## 🚀 Key Modules & What Was Built

### 1. 🛏️ Real-Time Room Heatmap & Occupancy Engine
* **2D Visual Grid**: Dynamic room grid filtered by floor and branch showing occupied vs. vacant beds.
* **Atomic Bed Level Tracking**: Bed `A`, `B`, `C` allocation prevents overbooking and supports room types (Single, Double, Triple, Custom).
* **Predictive Vacancy Highlight**: Visual indicator flags rooms with pending 30-day vacate notices, enabling owners to pre-book upcoming vacancies.

### 2. ⚡ Automated Monthly Rent Ledger Engine
* **Scheduled Background Processing**: Built using **BullMQ + Redis** workers running cron schedules on the 1st of every month.
* **Automated Carry-Forward Logic**: Automatically calculates `Previous Balance + Current Monthly Rent = Total Dues`.
* **Payment Resolution State Machine**: Automatically transitions invoice states between `PENDING`, `PARTIAL`, `PAID`, and `OVERDUE`.

### 3. 📊 Financial Intelligence & P&L Dashboard
* **Real-time Financial Widgets**: Instantly displays **Expected Rent**, **Collected Rent**, **Pending Dues**, and **Security Deposit Liabilities**.
* **Monthly Revenue Trends**: Visual breakdown of payment methods (Cash, UPI, Direct Bank Transfer).
* **Exportable Reports**: One-click operational reports for branch performance auditing.

### 4. 💬 WhatsApp Auto-Receipt Engine & Communications
* **Instant Digital Receipts**: Generates structured payment receipt messages with organization branding, payment ref, and transaction date.
* **Direct WhatsApp Integration**: Pre-formatted WhatsApp Web deep links for single-click sending by wardens.

### 5. 🛡️ Enterprise Security & Defense-in-Depth Middleware
* **Account Lockout Middleware**: Temporarily locks accounts after repeated failed login attempts to prevent brute-force attacks.
* **IP Blacklisting & Rate Limiting**: Redis-backed rate limiters protecting public auth endpoints (`/auth/login`, `/auth/register`).
* **Masked PII Logging**: Custom Winston logger automatically sanitizes sensitive fields (passwords, phone numbers, auth tokens) in system logs.
* **Strict Input Validation**: Zod schemas validate all incoming API payloads before reaching controllers.
* **Backend-Signed Cloudinary Uploads**: Eliminates exposed Cloudinary secrets on the client side; frontend requests temporary signatures for uploads.

---

## 🔑 Demo Access & Seed Credentials

To run the application locally with sample organizations, branches, wardens, and tenant records:

```bash
cd backend
npx prisma db seed
```

### Pre-configured Seed Credentials:
| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@u9pgs.com` | `u9pgs123` | Global Platform |
| **Warden (Org 1)** | `warden1@org1branch1.com` | `u9pgs123` | Organization 1 - Branch 1 |
| **Warden (Org 2)** | `warden1@org2branch1.com` | `u9pgs123` | Organization 2 - Branch 1 |

---

## 💻 Tech Stack & Engineering Architecture

```
                               ┌─────────────────────────┐
                               │   Next.js 15 App Router │
                               │ (React 19, Tailwind,    │
                               │  Zustand, Lucide)       │
                               └────────────┬────────────┘
                                            │ HTTPS / REST
                               ┌────────────▼────────────┐
                               │   Express.js API Engine │
                               │ (TypeScript, Zod, JWT)  │
                               └──────┬───────────┬──────┘
                                      │           │
                 ┌────────────────────▼──┐     ┌──▼──────────────────┐
                 │ PostgreSQL (Supabase) │     │ Redis + BullMQ      │
                 │ Prisma ORM + Pooled   │     │ (Async Queues &     │
                 │ Direct Queries        │     │ Rate Limiting)      │
                 └───────────────────────┘     └─────────────────────┘
```

| Layer | Technology Choice | Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 15 (App Router, Turbopack)** | Server-side routing, optimal INP performance, zero client bundle bloat. |
| **State Management** | **Zustand** | Lightweight, predictable client-side state without Context re-render performance penalties. |
| **Backend Runtime** | **Node.js + Express (TypeScript)** | Strongly typed API contracts, high throughput async I/O. |
| **Database & ORM** | **PostgreSQL (Supabase) + Prisma ORM** | Relational integrity, connection pooling with PgBouncer, migration tracking. |
| **Background Queues** | **BullMQ + Redis 7** | Distributed cron task execution for automated monthly rent generation. |
| **Media Storage** | **Cloudinary** | Secure direct signed client uploads for tenant ID proofs and photos. |

---

## 🚀 Local Installation & Setup Guide

### 1. Prerequisites
* **Node.js**: `v20.x` or higher
* **npm**: `v10.x` or higher
* **PostgreSQL**: Local instance or free [Supabase](https://supabase.com) project
* **Redis** *(Optional)*: Local Redis instance (Backend gracefully falls back to in-memory store if `REDIS_URL` is omitted).

### 2. Repository Cloning
```bash
git clone https://github.com/manishankar0922/EasyPG.git
cd EasyPG
npm install
```

### 3. Environment Setup

Create `backend/.env`:
```env
PORT=3001
NODE_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/easypg?schema=public"
DIRECT_URL="postgresql://postgres:password@localhost:5432/easypg?schema=public"
JWT_SECRET="your_development_jwt_secret_here"
REDIS_URL="redis://localhost:6379"

# Optional Cloudinary Configuration
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
```

### 4. Database Setup & Seeding
```bash
cd backend
npx prisma migrate deploy
npx prisma db seed
```

### 5. Running the Application
From the root directory, run both servers concurrently:
```bash
npm run dev
```

* **Frontend Dashboard**: `http://localhost:3000`
* **Backend API**: `http://localhost:3001/api/v1`
* **API Documentation**: `http://localhost:3001/api/v1/docs`

---

## 📡 Key API Endpoints Reference

### Authentication & Self
* `POST /api/v1/auth/login` — Login user (Returns JWT & user role)
* `GET  /api/v1/auth/me` — Fetch active session profile

### Branches & Multi-Tenancy
* `GET  /api/v1/branches` — List all branches under organization
* `POST /api/v1/branches` — Create a new branch (Owner only)

### Rooms & Occupancy Heatmap
* `GET  /api/v1/rooms/heatmap` — Real-time room grid & bed availability
* `POST /api/v1/rooms` — Create room with floor & bed capacity

### Admissions & Tenants
* `POST /api/v1/admissions` — Check-in tenant & assign bed
* `GET  /api/v1/tenants` — Filterable tenant directory (Active, Vacated, Overdue)

### Payments & Rent Ledger
* `GET  /api/v1/rent-ledgers` — Monthly rent ledger records
* `POST /api/v1/payments` — Record cash/UPI payment & send WhatsApp receipt

---

## 🛠️ Future Enhancements & Roadmap

- [x] Multi-tenant organization & branch hierarchy
- [x] Real-time 2D room heatmap & capacity management
- [x] Automated monthly rent ledger background generator
- [x] 30-day advance vacate notice tracking
- [x] Digital WhatsApp payment receipt generator
- [x] Enterprise security hardening (Rate limiting, IP ban, Account lockout)
- [ ] **Tenant Self-Service App**: Mobile PWA for tenants to pay rent via UPI and track complaint tickets.
- [ ] **Automated WhatsApp Reminders**: Scheduled SMS/WhatsApp notifications for overdue rent.
- [ ] **OCR Tenant Onboarding**: Auto-extract Aadhaar/Passport details from uploaded IDs.

---

## 👨‍💻 Author & Acknowledgments

Designed & Developed with ❤️ by **[Urban9Solutions](https://github.com/manishankar0922)**.
