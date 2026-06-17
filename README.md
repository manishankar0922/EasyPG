# U9 Solutions - Hostel Operations Intelligence Platform

![Version](https://img.shields.io/badge/version-v1.1-blue.svg)
![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Express%20%7C%20BullMQ%20%7C%20Supabase-success.svg)
![Architecture](https://img.shields.io/badge/architecture-Multi--Tenant-orange.svg)

U9 Solutions is a high-scale, multi-tenant SaaS application designed to automate and optimize hostel and PG (Paying Guest) operations through real-time intelligence and distributed task processing.

---

## 🏗️ Technical Architecture

### 1. Core Stack
*   **Frontend:** Next.js 15 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS, Zustand, Lucide Icons.
*   **Backend:** Node.js, Express.js (REST API), TypeScript, Zod.
*   **Data Layer:** PostgreSQL (Supabase Pooler), Prisma ORM.
*   **Authentication:** Custom Local Authentication (JWT, bcryptjs) with Role-Based Access Control.
*   **Infrastructure:** BullMQ & Redis (Distributed Queues), Docker.
*   **Storage:** Cloudinary (Direct secure signed uploads).

### 2. Multi-Tenant Branch Architecture
U9PGs uses a strict hierarchical data model to support large-scale property owners:
*   **Organization:** Represents the business owner (e.g., "Skyline Hostels"). Tied to the Owner's billing and subscription plan.
*   **Branch:** Physical properties/buildings under an Organization. An owner can manage multiple isolated Branches.
*   **Rooms & Floors:** Fully dynamic setup. Rooms are assigned to a Branch, Floors, and have configurable bed capacities and rent prices.
*   **Beds:** The lowest atomic unit. Tenants are checked directly into Beds to track real-time occupancy.

### 3. High-Scale Design & Security
The platform is designed to handle thousands of concurrent tenants securely:
*   **Role-Based Access Control (RBAC):** Strict Global Axios Interceptors and Next.js Edge Middleware ensure 401/403 redirects based on Profile status (e.g., rejecting Deactivated Wardens).
*   **Query Integrity:** Heatmap and Dashboard queries are heavily optimized using Prisma relations (eliminating N+1 queries) and `@@index` constraints on frequently queried fields (e.g., `branchId`, `roomId`, `status`).
*   **Background Workers:** Intensive tasks like the new **Automated Monthly Rent Ledger** are scheduled and offloaded to BullMQ workers to prevent API timeouts.
*   **Data Isolation:** Data is strictly isolated using `organizationId` and `branchId` globally.

---

## ✨ Core Business Modules

### 1. Hierarchical User Management (IAM)
*   **Super Admin:** Cross-organization management, subscription approval, global metrics, and complete lifecycle control (Suspend/Cascade Delete Organizations).
*   **Owner:** Full control over the Organization, P&L Reports, Multi-branch view, and Warden assignment.
*   **Warden:** Branch-restricted access. Can manage daily operations (check-ins, check-outs, cash collection) only for their assigned branch.

### 2. Automated Rent Ledger & Payments
*   **Monthly Automation:** A background system automatically generates expected rent dues on the 1st of every month, carrying forward previous balances.
*   **Payment Collection:** Supports Cash, UPI, and Bank Transfer tracking. Features automatic status resolution (PAID, PARTIAL, OVERDUE).

### 3. Vacate Notice System
*   **Predictive Vacancy:** Wardens can log 30-day or custom vacate notices for tenants.
*   **Heatmap Integration:** The Room Heatmap visually highlights beds that are scheduled to be vacated soon, allowing Owners to pre-book them and minimize revenue loss.

### 4. P&L and Intelligence Dashboard
*   **Owner Dashboard:** A high-level overview showing "Expected Rent", "Collected Rent", and "Pending Rent" across all branches.
*   **Room Heatmap:** A visual 2D grid showing occupied beds, vacant beds, and beds with pending vacate notices.

### 5. Subscription & Billing
*   **Manual SaaS Billing:** Subscription tracking via manual UPI verification. Super Admins approve/reject plan upgrades (Starter, Growth, Pro) directly from the dashboard.

---

## 🚀 Local Development Setup

### 1. Prerequisites
*   Node.js (v20+)
*   Supabase Account (Database)
*   Cloudinary Account (Image Storage)

### 2. Startup Dev Servers (Recommended)
You can start both the backend and frontend dev servers concurrently with a single command from the root directory:
```bash
npm run dev
```
*   **Frontend:** `http://localhost:3000`
*   **Backend:** `http://localhost:3001`
*   **API Documentation:** `http://localhost:3001/api/v1/docs`

Alternatively, you can run them individually:
*   **Backend:** `cd backend && npm run dev`
*   **Frontend:** `cd frontend && npm run dev`

### 3. Environment Configuration
**Backend (`backend/.env`):**
```env
PORT=3001
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=15"
DIRECT_URL="postgresql://...db.supabase.co:5432/postgres"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"
NODE_ENV=development
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="..."
```

---

## 🧪 Seed Credentials & DB Verification

### 1. Seed System Credentials
To reset and seed the database with clean test accounts:
```bash
cd backend
npx prisma db seed
```

Once seeded, you can log in using these official accounts:

| Role | Email Address | Password |
| :--- | :--- | :--- |
| **SuperAdmin** | `admin@u9pgs.com` | `u9pgs123` |
| **Warden (Org 1)** | `warden1@org1branch1.com` | `u9pgs123` |
| **Warden (Org 2)** | `warden1@org2branch1.com` | `u9pgs123` |

### 2. Verify Database Write Persistence
To verify read/write database operations are fully functional on your machine:
```bash
cd backend
npx ts-node src/test/scratch_db_check.ts
```

---

## 🛠️ Roadmap & Future Scope
- [x] Hierarchical User Management (Super Admin/Owner/Warden)
- [x] Intelligence Dashboard & Revenue Tracking
- [x] Automated Monthly Rent Ledger Generation
- [x] Vacate Notice Tracking System
- [x] Manual SaaS Subscription & Approval Workflow
- [x] Enterprise Security Hardening & Performance Audits
- [x] Whatsapp Auto-Receipts & Payment Accountability
- [ ] **Tenant Self-Service App:** OTP-based mobile login for tenants to view rent history and raise complaints.
- [ ] Offline PWA Support (Service Workers for Dashboard caching)
- [ ] Automated WhatsApp/SMS Notification Engine for Rent Reminders
- [ ] OCR-based Tenant ID Verification

*Built with ❤️ by Urban9Solutions*
