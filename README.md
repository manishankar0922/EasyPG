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
*   **Infrastructure:** BullMQ & Redis (Distributed Queues), Docker.

### 2. High-Scale Design
The platform is designed to handle thousands of concurrent tenants through:
*   **Background Workers:** Intensive tasks like monthly billing, OCR processing, and mass notifications are offloaded to BullMQ workers.
*   **Transactional Integrity:** Critical operations (Check-ins, Room Transfers) use Prisma transactions to prevent data drift and overbooking.
*   **Atomic Hierarchy:** Data is strictly isolated using `organizationId` globally.

---

## ✨ Features & Capabilities

### 👥 Hierarchical User Management
A sophisticated administrative system allows for delegated management:
*   **Owner:** Full control over the organization, branches, and high-level team creation.
*   **Warden:** Manages daily operations (rooms/tenants) and can create `Staff` members.
*   **Staff:** Entry-level access for recording payments and managing check-ins.
*   **Administrative Account Generation:** Admins create accounts via email; system auto-generates default passwords (`warden@123`, `staff@123`).

### 🏠 Intelligent Property Management
*   **Branch & Room Control:** Supports multiple branches per organization.
*   **Smart Room Numbering:** Validated 5-digit room identifiers for standardized tracking.
*   **Atomic Room Transfers:** Instant movement of tenants between rooms with automated capacity adjustments.

### 📊 Intelligence Dashboard
*   **Real-time KPIs:** Occupancy rates, Vacant beds, and Revenue collection status.
*   **Financial Tracking:** Precision monitoring of Invoiced vs. Collected vs. Pending dues.
*   **Branch Analytics:** Visual occupancy heatmaps across different hostel locations.

---

## 🚀 Local Development Setup

### 1. Prerequisites
*   Node.js (v20+)
*   Docker & Docker Compose
*   Supabase Account (Database + Auth)

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
SUPABASE_SERVICE_ROLE_KEY="admin-secret-key"
REDIS_URL="redis://localhost:6379"
ENABLE_MOCK_AUTH=true
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
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
For local development, use the `dev-bypass` token (if enabled) to log in as the default Owner:
*   **Organization:** Skyline Premium Hostels
*   **Default Owner:** Vikram Sethi
*   **Default Password Logic:**
    *   Warden: `warden@123`
    *   Staff: `staff@123`

---

## 🛠️ Roadmap
- [x] Hierarchical User Management (Owner/Warden/Staff)
- [x] Intelligence Dashboard & Revenue Tracking
- [x] Atomic Room Transfers
- [ ] Automated Monthly Billing Service (BullMQ)
- [ ] OCR-based Tenant ID Verification
- [ ] WhatsApp/SMS Notification Engine

*Built with ❤️ by Urbun9Solutions*
