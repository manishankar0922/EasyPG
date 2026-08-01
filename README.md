# EasyPG — Hostel & PG Management Platform

![Version](https://img.shields.io/badge/version-v1.1-blue.svg)
![Stack](https://img.shields.io/badge/Next.js%20%7C%20Express%20%7C%20Supabase-success.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**EasyPG** is a full-stack SaaS platform that helps hostel and PG (Paying Guest) owners manage their properties — tenants, rooms, rent, payments, and more — all from one dashboard.

> Built for multi-branch hostel businesses that need real-time occupancy tracking, automated rent ledgers, and role-based access for wardens.

---

## 🌐 Live Demo

| Service | URL |
| :--- | :--- |
| **Web App** | Coming soon |
| **API** | Coming soon |

### 🔑 Demo Login Credentials

> Run `cd backend && npx prisma db seed` first to populate these accounts.

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin** | `admin@u9pgs.com` | `u9pgs123` |
| **Warden (Org 1)** | `warden1@org1branch1.com` | `u9pgs123` |
| **Warden (Org 2)** | `warden1@org2branch1.com` | `u9pgs123` |

---

## ✨ What It Does

| Feature | Description |
| :--- | :--- |
| 🏢 **Multi-Branch Management** | Manage multiple hostels/PGs under one account |
| 🛏️ **Room & Bed Tracking** | Real-time occupancy heatmap per floor |
| 👥 **Tenant Check-In/Out** | Full admission workflow with bed assignment |
| 💰 **Automated Rent Ledger** | Auto-generates monthly dues, carries forward balances |
| 📊 **P&L Dashboard** | Expected vs Collected vs Pending rent at a glance |
| 📢 **Vacate Notice System** | 30-day notice tracking so you can pre-book vacating beds |
| 🔐 **Role-Based Access** | Super Admin → Owner → Warden with strict data isolation |
| 💬 **WhatsApp Receipts** | Auto-sends payment confirmation to tenants |

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | PostgreSQL via Supabase, Prisma ORM |
| **Auth** | JWT + bcrypt, Role-Based Access Control |
| **Jobs** | BullMQ + Redis (background rent ledger automation) |
| **Storage** | Cloudinary (tenant photos, documents) |
| **Deploy** | Frontend → Vercel, Backend → Render |

---

## 🚀 Run Locally

### Prerequisites
- Node.js v20+
- A [Supabase](https://supabase.com) project (free tier works)
- A [Cloudinary](https://cloudinary.com) account (free tier works)

### 1. Clone & Install
```bash
git clone https://github.com/manishankar0922/EasyPG.git
cd EasyPG
npm install
```

### 2. Set Up Environment Variables

**Backend** — create `backend/.env`:
```env
PORT=3001
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...db.supabase.co:5432/postgres"
JWT_SECRET="any-long-random-string"
NODE_ENV=development
```

**Frontend** — create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="your-upload-preset"
```

### 3. Set Up Database
```bash
cd backend
npx prisma migrate deploy   # run migrations
npx prisma db seed          # seed demo accounts
```

### 4. Start Dev Servers
```bash
# From root — starts both frontend & backend together
npm run dev
```

| Service | URL |
| :--- | :--- |
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| API Docs | http://localhost:3001/api/v1/docs |

---

## 📁 Project Structure

```
EasyPG/
├── frontend/          # Next.js app (UI)
│   └── src/
│       ├── app/       # Pages (App Router)
│       ├── components/ # Reusable UI components
│       └── store/     # Zustand state management
├── backend/           # Express API
│   └── src/
│       ├── routes/    # API endpoints
│       ├── middlewares/ # Auth, rate limiting, validation
│       ├── jobs/      # BullMQ background workers
│       └── lib/       # Utilities
└── docker-compose.yml # Local full-stack setup with Postgres + Redis
```

---

## 🗺️ Roadmap

- [x] Multi-tenant organization & branch management
- [x] Room heatmap & real-time occupancy tracking
- [x] Automated monthly rent ledger generation
- [x] Vacate notice tracking system
- [x] P&L dashboard with revenue analytics
- [x] WhatsApp payment receipts
- [x] Enterprise security hardening
- [ ] Tenant self-service mobile app (OTP login, rent history)
- [ ] Automated WhatsApp/SMS rent reminders
- [ ] OCR-based tenant ID verification
- [ ] Offline PWA support

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push and open a PR

---

*Built with ❤️ by [Urban9Solutions](https://github.com/manishankar0922)*
