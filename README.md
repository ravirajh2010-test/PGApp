# PG Stay — Multi-Tenant SaaS Platform

A full-stack SaaS web application for managing Paying Guest (PG) and hostel accommodations. Multiple PG owners can onboard their businesses, manage tenants, track payments, and more — all from a single platform.

## Features

### Multi-Tenancy (SaaS)
- **Organization onboarding** — PG owners register their business with a unique slug
- **Row-level tenant isolation** — each organization's data is fully isolated via `org_id`
- **Plan-based limits** — Free, Starter, Pro, Enterprise plans with property/bed/user limits
- **Subscription management** — billing, invoices, plan upgrades
- **Super Admin panel** — platform-wide administration for managing all organizations

### User Roles
- **Super Admin** — platform owner; manages all organizations, plans, subscriptions
- **Admin** — PG/hostel owner; manages their properties, rooms, beds, tenants, payments
- **Tenant** — PG resident; views profile, stay details, makes payments
- **Guest** — public visitor; views available beds for a specific organization

### Core Functionality
- Property management (buildings, rooms, beds)
- Tenant onboarding with auto-generated credentials
- Real-time occupancy tracking
- Payment tracking with Razorpay integration
- Email notifications for tenant onboarding
- Automatic checkout scheduling
- Audit logging

## Tech Stack

- **Frontend:** React (Vite) + Tailwind CSS + React Router
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (row-level multi-tenancy)
- **Payments:** Razorpay
- **Auth:** JWT with organization-scoped tokens

## Setup

1. Clone the repo
2. Install backend dependencies: `cd backend && npm install`
3. Install frontend dependencies: `cd frontend && npm install`
4. Set up environment variables (see below)
5. Start backend: `cd backend && npm run dev`
6. Start frontend: `cd frontend && npm run dev`

The database tables are auto-created on backend startup.

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/pgstay
JWT_SECRET=your-jwt-secret
RAZORPAY_KEY_ID=your-razorpay-key
RAZORPAY_KEY_SECRET=your-razorpay-secret
SUPER_ADMIN_EMAIL=superadmin@roomipilot.com
SUPER_ADMIN_PASSWORD=superadmin123
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

Create a `.env` file in the `frontend/` directory (optional for production):

```env
VITE_API_URL=http://localhost:5000/api
```

## Default Credentials

On first run, the system auto-creates:

| Role | Email | Password | Org Slug |
|------|-------|----------|----------|
| Super Admin | superadmin@roomipilot.com | superadmin123 | — |
| Admin | admin@roomipilot.com | admin123 | bajrang-hostels |

## API Routes

### Public
- `POST /api/auth/login` — Login (supports org slug)
- `POST /api/auth/register` — Register user within org
- `POST /api/auth/register-organization` — Onboard new organization
- `GET /api/guest/:orgSlug/buildings` — Public building list
- `GET /api/guest/:orgSlug/rooms/:buildingId` — Public room list
- `GET /api/guest/:orgSlug/vacancies/:roomId` — Available beds

### Admin (requires auth + org context)
- `GET/POST /api/admin/buildings`
- `GET/POST /api/admin/rooms`
- `GET/POST /api/admin/beds`
- `GET/POST/DELETE /api/admin/tenants`
- `GET /api/admin/occupancy`

### Organization (admin only)
- `GET/PUT /api/organization/me`
- `GET /api/organization/subscription`
- `GET /api/organization/invoices`
- `GET /api/organization/users`

### Super Admin
- `GET /api/super-admin/organizations`
- `GET /api/super-admin/stats`
- `POST /api/super-admin/organizations/:id/suspend`
- `POST /api/super-admin/organizations/:id/activate`
- `GET /api/super-admin/subscriptions`

## SaaS Plans

| Plan | Properties | Beds | Users | Price/mo |
|------|-----------|------|-------|----------|
| Free | 1 | 10 | 5 | £0 |
| Starter | 3 | 50 | 20 | £5 |
| Pro | 10 | 200 | 100 | £15 |
| Enterprise | Unlimited | Unlimited | Unlimited | £50 |