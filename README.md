# U9 Solutions - Hostel Operations Intelligence Platform

![Version](https://img.shields.io/badge/version-v1.1-blue.svg)
![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Express%20%7C%20BullMQ%20%7C%20Supabase-success.svg)
![Architecture](https://img.shields.io/badge/architecture-Multi--Tenant-orange.svg)

U9 Solutions is a high-scale, multi-tenant SaaS application designed to automate and optimize hostel and PG (Paying Guest) operations through real-time intelligence and distributed task processing.

---

## 🏗️ Technical Architecture

### 1. Core Stack
*   **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Zustand, Lucide Icons.
*   **Backend:** Node.js, Express.js (REST API), TypeScript, Zod.
*   **Data Layer:** PostgreSQL (Supabase), Prisma ORM.
*   **Authentication:** Clerk (with local Dev Bypass & Secure JWT impersonation).
*   **Infrastructure:** BullMQ & Redis (Distributed Queues), Docker.
*   **Storage:** Cloudinary (Direct secure signed uploads).

### 2. High-Scale Design & Security
The platform is designed to handle thousands of concurrent tenants securely:
*   **Background Workers:** Intensive tasks like monthly billing and mass notifications are offloaded to BullMQ workers.
*   **Transactional Integrity:** Critical operations (Check-ins, Room Transfers) use Prisma transactions with strict foreign-key verification to prevent data drift and overbooking.
*   **Enterprise-Grade Security:** Hardened with `helmet`, strict `cors` whitelists, `express-rate-limit`, `hpp` (HTTP Parameter Pollution prevention), and `express-mongo-sanitize`.
*   **Data Isolation:** Data is strictly isolated using `organizationId` globally, secured via a centralized Prisma query wrapper (`secureQuery`). PII is scrubbed via response sanitizers.
*   **Production Logging:** Implementing `winston` and `winston-daily-rotate-file` to keep extensive error and combined server logs with PII redaction.

---

## ✨ Features & Capabilities

### 👥 Hierarchical User Management
A sophisticated administrative system allows for delegated management:
*   **Super Admin:** Cross-organization actions and owner impersonation (using highly secure fallback tokens).
*   **Owner:** Full control over the organization, branches, and high-level team creation.
*   **Warden:** Manages daily operations (rooms/tenants) and can create `Staff` members.
*   **Staff:** Entry-level access for recording payments and managing check-ins.

### 🏠 Intelligent Property Management
*   **Branch & Room Control:** Supports multiple branches per organization.
*   **Smart Room Numbering:** Validated room identifiers for standardized tracking.
*   **Atomic Operations:** Safe bed allocation and instant movement of tenants.
*   **Document Management:** Integrated Cloudinary signing mechanism allowing frontend to directly and securely upload tenant documents.

### 📊 Intelligence Dashboard
*   **Real-time KPIs:** Occupancy rates, Vacant beds, and Revenue collection status.
*   **Financial Tracking:** Precision monitoring of Invoiced vs. Collected vs. Pending dues.
*   **Branch Analytics:** Visual occupancy heatmaps across different hostel locations.

---

## 🚀 Local Development Setup

### 1. Prerequisites
*   Node.js (v20+)
*   Docker & Docker Compose
*   Supabase Account (Database)
*   Clerk Account (Authentication)
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
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
REDIS_URL="redis://localhost:6379"

# Clerk Authentication
CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
ENABLE_MOCK_AUTH=true
NODE_ENV=development

# Security
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="super-secret-key"

# Cloudinary
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="..."
```

### 4. Database Seeding (Hierarchical Data)
The new seeding script creates a complete test environment with realistic relationships:
```bash
cd backend
npm install
npx prisma db push --force-reset
npx prisma db seed
```

---

## 🧪 Testing Credentials
For local development, use the mock authentication headers (if `ENABLE_MOCK_AUTH=true` is set) to bypass Clerk.
Example:
```bash
Authorization: Bearer mock-dev-token
```
This automatically authenticates you as the first Owner profile available in the local database.

---

## 🛠️ Roadmap
- [x] Hierarchical User Management (Super Admin/Owner/Warden/Staff)
- [x] Intelligence Dashboard & Revenue Tracking
- [x] Atomic Room Transfers & Protected Transactions
- [x] Enterprise Security Hardening & Logging
- [x] Cloudinary Signed Upload Integration
- [ ] Automated Monthly Billing Service (BullMQ)
- [ ] OCR-based Tenant ID Verification
- [ ] WhatsApp/SMS Notification Engine

*Built with ❤️ by Urban9Solutions*
