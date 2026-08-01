# EasyPG — Landing Page Design Plan

> **Status**: Planning only — no code implemented yet.
> **Goal**: A public-facing SaaS marketing/intro page for EasyPG, deployed at the root `/` of the domain, replacing the current redirect-only `page.tsx`. Includes a hero, how-it-works walkthrough, features, pricing, contact section, and a Sign In button.

---

## 🎯 Page Objective

| Goal | Description |
|---|---|
| **Primary** | Convert hostel/PG owners visiting the site into trial signups |
| **Secondary** | Let existing wardens quickly find and click Sign In |
| **Tertiary** | Give a clear product overview to anyone (investors, mentors, reviewers) |

---

## 🗂️ Page Sections (Top to Bottom)

### 1. 🔝 Navbar / Header
- **Logo**: EasyPG logo + brand name (left)
- **Navigation links** (right):
  - Features
  - How It Works
  - Pricing
  - Contact
- **CTA Button**: `Sign In →` (opens `/login`)
- **Behaviour**: Sticky on scroll, glass-morphism blur effect on scroll

---

### 2. 🦸 Hero Section
- **Headline**: `"Run your PG business on autopilot"`
- **Sub-headline**: `"Automate rent collection, track occupancy in real time, and manage multiple branches — all from one dashboard."`
- **CTA Buttons**:
  - Primary: `Start Free Trial` → `/login` or `/register`
  - Secondary: `Watch How It Works` → scrolls to Section 4
- **Hero Visual**: Animated screenshot / mockup of the EasyPG Dashboard (room heatmap + revenue widget)
- **Trust Signals** (below the CTA):
  - `✅ No credit card required`
  - `✅ 14-day free trial`
  - `✅ Supports multi-branch hostels`

---

### 3. 📊 Stats / Social Proof Bar
A single horizontal strip showing platform scale. Examples:

| Stat | Value |
|---|---|
| Active Branches | 50+ |
| Tenant Records | 5,000+ |
| Rent Auto-Generated | ₹1 Cr+ |
| Response Time | < 200ms |

> These can be animated counters that count up when the section scrolls into view.

---

### 4. ⚙️ How It Works (3-Step Walkthrough)
Horizontal 3-column cards with icons and brief descriptions:

**Step 1 — Set Up Your Branch**
> Add your hostel, configure rooms, floors, and beds. Invite your warden in 2 minutes.

**Step 2 — Check In Tenants**
> Assign beds, capture Aadhaar details, set monthly rent. Tenant profile is live instantly.

**Step 3 — Collect & Track Automatically**
> Rent dues are generated on the 1st of every month. Record payments, send WhatsApp receipts, and view P&L from the dashboard.

---

### 5. ✨ Features Section
A 3×2 grid of feature cards with icons:

| Icon | Feature | Description |
|---|---|---|
| 🛏️ | Room Heatmap | 2D visual grid of occupied, vacant, and upcoming-vacancy beds |
| 💰 | Auto Rent Ledger | Monthly dues auto-generated with carry-forward balance tracking |
| 📊 | P&L Dashboard | Expected vs Collected vs Pending revenue per branch |
| 🔔 | WhatsApp Receipts | One-click payment confirmations sent directly to tenants |
| 🏢 | Multi-Branch | Manage all your properties from a single owner account |
| 🔐 | Role-Based Access | Owner, Warden, and Tenant-level access with strict data isolation |

---

### 6. 💸 Pricing Section
Three-tier pricing cards:

| Plan | Price | Best For | Key Limits |
|---|---|---|---|
| **Starter** | ₹0 / month | Single-branch PG, just getting started | 1 branch, 30 beds |
| **Pro** ⭐ | ₹499 / month | Growing hostels with 2–5 branches | Unlimited branches & tenants |
| **Enterprise** | Custom | Large chains (10+ branches) | Custom limits, SLA, dedicated support |

- Highlighted plan: **Pro** (most popular)
- CTA under each: `Get Started →`

---

### 7. 🤝 Contact / Support Section
Split layout (left: text, right: contact form):

**Left Side — Contact Info**:
- 📧 Email: `support@u9pgs.com` *(placeholder — update with real email)*
- 💬 WhatsApp: Click-to-chat button
- 🕐 Support Hours: Mon–Sat, 9 AM – 6 PM IST
- 📍 Location: Bengaluru, India

**Right Side — Contact Form Fields**:
- Name
- Email / Phone
- Message / Query
- `Send Message` button (POST to a simple API route or EmailJS)

---

### 8. 🔑 Sign In (Entry Point)
- A persistent **"Sign In →"** button in the Navbar (always visible)
- On click → navigates to `/login` (existing unified login page)
- No new login UI needed — just link through to the existing page

---

### 9. 🦶 Footer

| Column | Content |
|---|---|
| **Brand** | Logo, tagline, GitHub link |
| **Product** | Features, How It Works, Pricing, Roadmap |
| **Legal** | Privacy Policy, Terms of Service |
| **Contact** | Email, WhatsApp support link |

---

## 🎨 Design System & Aesthetics

### Color Palette
| Token | Color | Usage |
|---|---|---|
| `--primary` | `#4F46E5` (Indigo 600) | CTAs, active states, highlights |
| `--primary-dark` | `#3730A3` (Indigo 800) | Hover states |
| `--bg-dark` | `#0F0F1A` | Dark hero background |
| `--bg-card` | `#1A1A2E` | Feature cards background |
| `--text-primary` | `#F8FAFC` | Headings on dark bg |
| `--text-muted` | `#94A3B8` | Sub-text, labels |
| `--accent` | `#10B981` (Emerald) | Success badges, checkmarks |
| `--surface` | `rgba(255,255,255,0.05)` | Glass-morphism cards |

### Typography
| Role | Font | Weight | Size |
|---|---|---|---|
| Hero Headline | **Inter** | 800 (ExtraBold) | 56px |
| Section Heading | **Inter** | 700 (Bold) | 36px |
| Body Text | **Inter** | 400 (Regular) | 16px |
| Labels / Tags | **Inter** | 500 (Medium) | 12px |

### Animations & Micro-Interactions
- **Hero**: Fade-in + slide-up on load (CSS keyframes)
- **Stats bar**: Animated count-up on scroll into viewport (`IntersectionObserver`)
- **Feature cards**: Hover lift (`transform: translateY(-4px)`, box-shadow transition)
- **Navbar**: Backdrop blur activates after scrolling 60px
- **CTA Buttons**: Subtle scale on hover (`transform: scale(1.03)`)

---

## 🗺️ Routing Strategy

| Route | Purpose | Action Required |
|---|---|---|
| `/` (root) | Landing page | Modify `frontend/src/app/page.tsx` |
| `/login` | Existing unified login | No change |
| `/contact` *(optional)* | Separate contact page | New file if needed |

> **Key logic change in `page.tsx`**:
> - If user **has a valid auth token** → redirect to `/dashboard` (keep as-is)
> - If user **is not logged in** → render the landing page (**instead of** redirecting to `/login`)

---

## 📦 New Components to Create

| Component | Path | Description |
|---|---|---|
| `Navbar` | `components/landing/Navbar.tsx` | Sticky header with nav links + Sign In CTA |
| `HeroSection` | `components/landing/HeroSection.tsx` | Headline, sub-text, CTAs, hero mockup |
| `StatsBar` | `components/landing/StatsBar.tsx` | Animated counter stats strip |
| `HowItWorks` | `components/landing/HowItWorks.tsx` | 3-step walkthrough cards |
| `FeaturesGrid` | `components/landing/FeaturesGrid.tsx` | 3×2 feature card grid |
| `PricingSection` | `components/landing/PricingSection.tsx` | 3-tier pricing cards |
| `ContactSection` | `components/landing/ContactSection.tsx` | Contact info + form |
| `Footer` | `components/landing/Footer.tsx` | Links, brand, social icons |

---

## 🚀 Deployment Plan

- Landing page lives in the **same Next.js frontend app** — no separate deployment
- Hosted on **Vercel** (already connected to the repo)
- Custom domain: `easypg.in` or `u9pgs.com` *(configure in Vercel → Domains)*
- SEO: Add `<title>`, `<meta description>`, and Open Graph tags to `layout.tsx`

---

## ✅ Open Questions to Confirm Before Implementation

- [ ] Real contact email / WhatsApp number to show publicly
- [ ] Exact domain to use (`easypg.in`, `u9pgs.com`, or Vercel default?)
- [ ] Pricing amounts — are ₹0 / ₹499 confirmed or placeholders?
- [ ] Hero visual — use a real app screenshot or a designed mockup image?
- [ ] Contact form backend — EmailJS (no backend) or a new API route?
- [ ] Should a `/register` (self-signup) page be built, or only `/login`?
