# U9 Solutions - Hostel Operations Intelligence Platform

![Version](https://img.shields.io/badge/version-MVP__v1-blue.svg)
![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Express%20%7C%20Prisma%20%7C%20Supabase-success.svg)

U9 Solutions is a comprehensive, multi-tenant SaaS application designed to streamline and automate hostel and PG (Paying Guest) operations. 

## 🏗️ Tech Stack
*   **Frontend:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS, Zustand, Axios, Lucide Icons.
*   **Backend:** Node.js, Express.js, TypeScript, Zod (Validation).
*   **Database & ORM:** PostgreSQL (via Supabase), Prisma ORM.
*   **Authentication:** Supabase Auth (JWT).

## ✨ Features Implemented (Phase 1 MVP)
*   **Multi-Tenant Architecture:** Strict data isolation by `organizationId` across all models.
*   **Secure Authentication:** Integration with Supabase GoTrue, complete with an atomic registration flow and role-based access control (Owner/Warden).
*   **Property Management:** CRUD operations for Branches and Rooms, including automatic capacity calculations and availability tracking.
*   **Tenant & Admission Management:** Complete lifecycle management (Check-in, Check-out, Room Transfers) with transactional database integrity preventing overbooking.
*   **Financial Operations:** Automated monthly invoice generation, precise payment tracking (handling partial and full payments), and overdue detection.
*   **Intelligence Dashboard:** Real-time metrics for occupancy rates, vacant capacities, and revenue tracking (invoiced vs. collected vs. pending).

## 🚀 Local Development Setup

### 1. Prerequisites
*   Node.js (v18+)
*   npm or yarn
*   A Supabase project (for PostgreSQL and Auth)

### 2. Environment Configuration
Create `.env` files in both the `backend` and `frontend` directories based on the provided Supabase credentials.

**Backend (`backend/.env`):**
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://...:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...:5432/postgres"
ENABLE_MOCK_AUTH=true
SUPABASE_URL="..."
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api"
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
```

### 3. Database Initialization & Seeding
```bash
cd backend
npm install
npx prisma db push
npx prisma db seed          # Seeds dummy Organization & Rooms
npx ts-node prisma/seed-auth.ts # Seeds the Supabase Auth user
```

### 4. Running the Servers
Start both servers simultaneously in separate terminal windows:

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Test Credentials
Access the dashboard at `http://localhost:3000` using:
*   **Email:** `admin@u9solutions.com`
*   **Password:** `Password123!`

---
*Built with ❤️ by sivaganeshv1729*
