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
EasyPG uses a strict hierarchical data model to support large-scale property owners:
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
*   Docker & Docker Compose
*   Supabase Account (Database)
*   Cloudinary Account (Image Storage)

### 2. Infrastructure Startup
The project includes a full Docker environment for Redis and Monitoring tools:
```bash
docker-compose up -d
```
*   **Redis:** `localhost:6379`
*   **Bull Board (Queue Monitor):** `localhost:3001`

### 3. Environment Configuration
**Backend (`backend/.env`):**
```env
PORT=4000
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://...db.supabase.co:5432/postgres"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"
ENABLE_MOCK_AUTH=true
NODE_ENV=development

# Cloudinary
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="..."
```

### 4. Database Setup
```bash
cd backend
npm install
npx prisma db push
```

---

## 🧪 Testing Credentials & Developer Bypass
The platform uses a custom JWT authentication system. For local development, there are built-in mock accounts to quickly bypass full database validation:

*   **Super Admin Login:** Use `admin@gmail.com` with password `admin123`.
*   **Dev/Owner Login:** Use `dev@gmail.com` with password `dev123`.
*   *Note:* The mock credentials return a hardcoded developer JWT token to instantly grant access. To test real authentication flows, create a new Organization via the Super Admin portal and log in with the newly generated credentials.

---

## 🛠️ Roadmap & Future Scope
- [x] Hierarchical User Management (Super Admin/Owner/Warden)
- [x] Intelligence Dashboard & Revenue Tracking
- [x] Automated Monthly Rent Ledger Generation
- [x] Vacate Notice Tracking System
- [x] Manual SaaS Subscription & Approval Workflow
- [x] Enterprise Security Hardening & Performance Audits
- [ ] Offline PWA Support (Service Workers for Dashboard caching)
- [ ] Automated WhatsApp/SMS Notification Engine for Rent Reminders
- [ ] OCR-based Tenant ID Verification

*Built with ❤️ by Urban9Solutions*
