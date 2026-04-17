# PG Stay — Project Documentation

> **Product Name:** RoomiPilot (marketed as RoomiPilot, codebase named PG Stay)  
> **Type:** Multi-tenant SaaS platform  
> **Domain:** Hostel / Paying Guest (PG) accommodation management  
> **Last Updated:** April 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Features & Modules](#3-features--modules)
4. [Pricing Plans](#4-pricing-plans)
5. [User Roles](#5-user-roles)
6. [Backend — Routes & Controllers](#6-backend--routes--controllers)
7. [Backend — Models](#7-backend--models)
8. [Backend — Middleware](#8-backend--middleware)
9. [Backend — Services](#9-backend--services)
10. [Frontend — Pages & Components](#10-frontend--pages--components)
11. [Frontend — State & API Layer](#11-frontend--state--api-layer)
12. [Email Notifications](#12-email-notifications)
13. [Scheduled Jobs](#13-scheduled-jobs)
14. [Database Schema](#14-database-schema)
15. [API Reference Summary](#15-api-reference-summary)
16. [Deployment](#16-deployment)
17. [Environment Variables](#17-environment-variables)
18. [Local Development Setup](#18-local-development-setup)
19. [Development Workflow & Quality Gates](#19-development-workflow--quality-gates)

---

## 1. Project Overview

PG Stay (RoomiPilot) is a full-stack, multi-tenant SaaS web application that helps property owners manage their paying guest accommodations end-to-end.

Each property owner registers as an **organization** on the platform and gets isolated data storage. They can then:

- Add and manage buildings, rooms, and beds.
- Onboard tenants and auto-generate login credentials.
- Track monthly rent payments (online via Razorpay, or offline).
- Send bulk messages and reminders to tenants.
- View floor-level occupancy layouts.
- Export payment reports as CSV, Excel, or PDF.
- Manage their subscription plan (Free → Starter → Pro → Enterprise).

A **Super Admin** role exists at the platform level to oversee all organizations, manage plans, view billing, and clean up inactive users.

Tenants get their own portal to view stay details, payment history, and pay rent online.

---

## 2. Technology Stack

### Backend

| Component         | Technology / Library                        | Version    |
| ----------------- | ------------------------------------------- | ---------- |
| Runtime           | Node.js                                     | ≥18.x      |
| Framework         | Express.js                                  | ^5.2.1     |
| Database          | PostgreSQL (via `pg` driver)                | ^8.20.0    |
| Authentication    | JWT (`jsonwebtoken`) + bcryptjs             | 9.0.3 / 3.0.3 |
| Email (primary)   | Resend API                                  | ^6.10.0    |
| Email (fallback)  | Nodemailer (Gmail SMTP)                     | ^8.0.4     |
| Payment (rent)    | Razorpay                                    | ^2.9.6     |
| Payment (subscription) | Stripe                                 | ^22.0.1    |
| Scheduling        | node-cron                                   | ^3.0.3     |
| API Documentation | swagger-jsdoc + swagger-ui-express          | 6.2.8 / 5.0.0 |
| Dev Server        | nodemon                                     | ^3.1.14    |

### Frontend

| Component          | Technology / Library         | Version    |
| ------------------ | ---------------------------- | ---------- |
| Framework          | React                        | ^18.2.0    |
| Build Tool         | Vite                         | ^4.3.2     |
| Styling            | Tailwind CSS                 | ^3.2.7     |
| Routing            | React Router v6              | ^6.8.0     |
| HTTP Client        | Axios                        | ^1.3.4     |
| Internationalization | react-intl                 | ^6.8.9     |
| PDF Export         | jsPDF                        | ^4.2.1     |
| Excel Export       | xlsx (SheetJS)               | ^0.18.5    |
| Linting            | ESLint                       | —          |

### Infrastructure

| Layer     | Service        | Notes                                              |
| --------- | -------------- | -------------------------------------------------- |
| Backend   | Railway        | Node.js web service, PostgreSQL add-on             |
| Frontend  | Vercel         | Vite SPA with `/* → /index.html` rewrite           |
| Database  | Railway PostgreSQL | Production: single-DB schema mode (`USE_SINGLE_DB=true`) |

---

## 3. Features & Modules

### 3.1 Organization Onboarding
- Public registration wizard (`/onboarding`) to create a new org with admin account.
- Paid plans require Stripe checkout (redirect flow). On success, org + admin are provisioned automatically.
- Free plan registers immediately without payment.
- On registration: org schema/database is created, admin account is created, welcome email is sent.

### 3.2 Property Management
- **Buildings** — Create, update, delete. Each building has a name and location.
- **Rooms** — Belong to a building. Have a room number, floor (auto-computed from room number prefix), and capacity.
- **Beds** — Belong to a room. Have a bed identifier and a status (`vacant` or `occupied`). Count of beds cannot exceed room capacity.
- Deletion is cascading: deleting a building deletes all rooms → beds → tenants → payments.

### 3.3 Tenant Management
- Admin creates a tenant: assigns a vacant bed, sets rent, start date, end date, phone.
- On creation: a user account is created with a generated temp password; credentials email is sent to the tenant.
- Admins can search tenants by name, email, or phone.
- Admins can view payment history month-by-month for any tenant.
- Admins can manually deactivate/delete a tenant (vacates the bed, cleans up all data).

### 3.4 Payment Management
- **Payment Info page** — Shows all tenants for a given month, with their bill status (Paid / Unpaid / N/A).
  - Bill is considered "generated" on the 2nd of the following month.
  - Rent is prorated for partial months.
- **Online payment** — Tenant can pay via Razorpay from their dashboard (creates an order, verifies signature).
- **Offline payment** — Admin can mark payment received offline (duplicate check enforced).
- **Payment reminder** — Admin can send email reminder to any tenant.
- **Rent receipt** — Automatically sent when offline/online payment is recorded.
- **Export** — Payment reports exportable as CSV, Excel (.xlsx), or landscape PDF.

### 3.5 Floor Layout & Occupancy
- Visual floor layout showing each building's floors → rooms → beds with occupied/vacant status.
- Tenant names displayed on occupied beds.
- Occupancy summary (total/occupied/vacant) per room and per floor.

### 3.6 Messenger (Bulk Messaging)
- Admin can send HTML emails to groups of tenants:
  - All tenants in the org
  - Tenants in a specific building
  - Tenants on a specific floor
  - Tenants in a specific room
- Custom subject and message body per send.

### 3.7 Tenant Portal
- Tenant views their profile, stay details (building, room, bed, dates, rent).
- Views payment history sorted by most recent.
- Can pay rent online (Razorpay).
- Can look up admin contact.
- Can change password (OTP-based).

### 3.8 Guest / Public View
- Public URL: `/{orgSlug}` — Shows the organization's available buildings/rooms without login.
- Visitors can browse buildings, rooms per building, and vacancies per room.
- Occupancy summary is shown.

### 3.9 Organization Settings
- Admin views and updates org profile (name, email, phone, address).
- Views current subscription + plan details.
- Views all invoices.
- Views audit logs (all actions taken in the org).
- Views all user accounts in the org.

### 3.10 Super Admin Dashboard
- Platform-wide stats: total orgs, users, beds, occupancy rate, plan distribution, monthly revenue.
- List and manage all organizations (view, Edit, suspend, activate, delete, change plan).
- Manage plan limits (max properties, beds, users per plan; pricing).
- View all platform subscriptions and invoices.
- View audit logs per organization.
- Find and manage inactive users (disable, delete, send reminder email).

### 3.11 Subscription & Billing
- Free plan: up to 1 property, 10 beds, 5 users.
- Paid plans (Starter/Pro/Enterprise) expand these limits.
- Stripe checkout for plan upgrades — session metadata carries org registration data.
- Super admin can override any org's plan.

### 3.12 Internationalization (i18n)
- Supported languages: **English**, **Hindi**, **Telugu**.
- Supported regions: **India (INR ₹)**, **United Kingdom (GBP £)**.
- Language/region stored in `localStorage`, applied globally via `react-intl` `IntlProvider`.

---

## 4. Pricing Plans

| Plan       | Properties | Beds | Users | Price/month |
| ---------- | ---------- | ---- | ----- | ----------- |
| Free       | 1          | 10   | 5     | £0          |
| Starter    | 3          | 50   | 20    | £5          |
| Pro        | 10         | 200  | 100   | £15         |
| Enterprise | Unlimited  | Unlimited | Unlimited | £50  |

Plan limits are enforced at the API level via `checkPlanLimits` middleware (returns HTTP 403 when limit reached).

---

## 5. User Roles

| Role          | Scope          | Capabilities                                                                        |
| ------------- | -------------- | ----------------------------------------------------------------------------------- |
| `super_admin` | Platform-wide  | Manages all orgs, plans, billing, inactive users. Can access any org via header.   |
| `admin`       | Per-org        | Full CRUD on buildings/rooms/beds/tenants/payments. Messaging. Org settings.        |
| `tenant`      | Per-org        | View profile, stay details, payment history. Pay rent online.                       |
| `guest`       | Per-org        | Disabled/deactivated state. No meaningful access.                                   |

---

## 6. Backend — Routes & Controllers

### 6.1 Authentication (`/api/auth`)

| Method | Path                     | Middleware          | Controller Function       | Purpose                                        |
| ------ | ------------------------ | ------------------- | ------------------------- | ---------------------------------------------- |
| POST   | `/register`              | —                   | `register`                | Register a new tenant in an org                |
| POST   | `/login`                 | —                   | `login`                   | Login (single-org or multi-org flow)           |
| POST   | `/register-organization` | —                   | `registerOrganization`    | Register a new org (free plan, no Stripe)      |
| POST   | `/change-password`       | auth, isolation     | `changePassword`          | Change password using OTP verification         |
| POST   | `/send-otp`              | auth, isolation     | `sendOtp`                 | Send 6-digit OTP to user email (5-min expiry)  |

**Multi-org login flow:** If a user's email is mapped to multiple orgs in `user_org_map`, the login endpoint returns HTTP 300 with the list of orgs. The frontend prompts the user to choose, then re-calls login with `orgSlug`.

### 6.2 Admin (`/api/admin`)

All routes require: `authenticateToken` → `authorizeRole(['admin'])` → `tenantIsolation`

| Method | Path                             | Extra Middleware        | Function                     |
| ------ | -------------------------------- | ----------------------- | ---------------------------- |
| GET    | `/tenants`                       | —                       | `getTenants`                 |
| POST   | `/tenants`                       | checkPlanLimits('user') | `createTenant`               |
| PUT    | `/tenants/:id`                   | —                       | `updateTenant`               |
| DELETE | `/tenants/:id`                   | —                       | `deleteTenant`               |
| POST   | `/process-checkouts`             | —                       | `processCheckouts`           |
| GET    | `/occupancy`                     | —                       | `getOccupancy`               |
| GET    | `/available-beds`                | —                       | `getAvailableBeds`           |
| GET    | `/floor-layout`                  | —                       | `getFloorLayout`             |
| GET    | `/floor-layout-beds`             | —                       | `getFloorLayoutWithBeds`     |
| GET    | `/buildings`                     | —                       | `getBuildings`               |
| POST   | `/buildings`                     | checkPlanLimits('building') | `createBuilding`         |
| PUT    | `/buildings/:id`                 | —                       | `updateBuilding`             |
| DELETE | `/buildings/:id`                 | —                       | `deleteBuilding`             |
| GET    | `/rooms`                         | —                       | `getRooms`                   |
| POST   | `/rooms`                         | —                       | `createRoom`                 |
| PUT    | `/rooms/:id`                     | —                       | `updateRoom`                 |
| DELETE | `/rooms/:id`                     | —                       | `deleteRoom`                 |
| GET    | `/beds`                          | —                       | `getBeds`                    |
| POST   | `/beds`                          | checkPlanLimits('bed')  | `createBed`                  |
| PUT    | `/beds/:id`                      | —                       | `updateBed`                  |
| DELETE | `/beds/:id`                      | —                       | `deleteBed`                  |
| GET    | `/payment-info`                  | —                       | `getPaymentInfo`             |
| POST   | `/payment-reminder/:tenantId`    | —                       | `sendPaymentReminderEmail`   |
| POST   | `/mark-offline-pay/:tenantId`    | —                       | `markOfflinePay`             |
| GET    | `/search-tenants`                | —                       | `searchTenants`              |
| GET    | `/tenant-payment-history/:id`    | —                       | `getTenantPaymentHistory`    |
| POST   | `/deactivate-user/:userId`       | —                       | `deactivateUser`             |
| GET    | `/messenger/groups`              | —                       | `getMessengerGroups`         |
| POST   | `/messenger/send`                | —                       | `sendGroupMessage`           |
| GET    | `/debug/tenants-consistency`     | —                       | `checkTenantsDatabaseConsistency` |

### 6.3 Tenant (`/api/tenant`)

All routes require: `authenticateToken` → `authorizeRole(['tenant'])` → `tenantIsolation`

| Method | Path               | Function              | Purpose                              |
| ------ | ------------------ | --------------------- | ------------------------------------ |
| GET    | `/profile`         | `getProfile`          | Return user profile                  |
| GET    | `/stay-details`    | `getStayDetails`      | Return current stay record           |
| GET    | `/payments`        | `getPayments`         | Payment history (DESC by month/year) |
| POST   | `/pay`             | `createPaymentOrder`  | Create Razorpay order for rent       |
| POST   | `/verify-payment`  | `verifyPayment`       | Verify and record Razorpay payment   |
| GET    | `/admin-contact`   | `getAdminContact`     | Return admin's name, email, org info |

### 6.4 Guest (`/api/guest`) — Public (No Auth)

| Method | Path                            | Middleware            | Function        |
| ------ | ------------------------------- | --------------------- | --------------- |
| GET    | `/:orgSlug/buildings`           | `resolveOrgFromSlug`  | `getBuildings`  |
| GET    | `/:orgSlug/rooms/:buildingId`   | `resolveOrgFromSlug`  | `getRooms`      |
| GET    | `/:orgSlug/vacancies/:roomId`   | `resolveOrgFromSlug`  | `getVacancies`  |
| GET    | `/:orgSlug/occupancy`           | `resolveOrgFromSlug`  | `getOccupancy`  |

`resolveOrgFromSlug` — Custom middleware that reads org from URL slug, validates org is `active`, fetches org-specific DB pool, and injects `req.orgId` + `req.pool`.

### 6.5 Super Admin (`/api/super-admin`)

All routes require: `authenticateToken` → `superAdminOnly`

| Method | Path                                         | Function                      |
| ------ | -------------------------------------------- | ----------------------------- |
| GET    | `/stats`                                     | `getPlatformStats`            |
| GET    | `/organizations`                             | `getOrganizations`            |
| GET    | `/organizations/:id`                         | `getOrganizationById`         |
| PUT    | `/organizations/:id`                         | `updateOrganization`          |
| POST   | `/organizations/:id/suspend`                 | `suspendOrganization`         |
| POST   | `/organizations/:id/activate`                | `activateOrganization`        |
| DELETE | `/organizations/:id`                         | `deleteOrganization`          |
| PUT    | `/organizations/:id/plan`                    | `updateOrganizationPlan`      |
| GET    | `/subscriptions`                             | `getSubscriptions`            |
| GET    | `/invoices`                                  | `getInvoices`                 |
| GET    | `/plans`                                     | `getPlanLimits`               |
| PUT    | `/plans/:plan`                               | `updatePlanLimits`            |
| GET    | `/audit-logs`                                | `getAuditLogs`                |
| GET    | `/inactive-users`                            | `getInactiveUsers`            |
| POST   | `/inactive-users/:orgId/:userId/disable`     | `disableInactiveUser`         |
| DELETE | `/inactive-users/:orgId/:userId`             | `deleteInactiveUser`          |
| POST   | `/inactive-users/:orgId/:userId/remind`      | `sendInactiveUserReminder`    |

### 6.6 Organization (`/api/organization`)

All routes require: `authenticateToken` → `authorizeRole(['admin'])` → `tenantIsolation`

| Method | Path             | Function                | Purpose                                  |
| ------ | ---------------- | ----------------------- | ---------------------------------------- |
| GET    | `/me`            | `getMyOrganization`     | Org details + stats + subscription       |
| PUT    | `/me`            | `updateMyOrganization`  | Update org profile                       |
| GET    | `/subscription`  | `getMySubscription`     | Current subscription + available plans   |
| GET    | `/invoices`      | `getMyInvoices`         | All invoices for org                     |
| GET    | `/audit-logs`    | `getMyAuditLogs`        | Audit trail from org database            |
| GET    | `/users`         | `getMyUsers`            | All users in org                         |

### 6.7 Stripe (`/api/stripe`)

| Method | Path                      | Function                 | Purpose                                          |
| ------ | ------------------------- | ------------------------ | ------------------------------------------------ |
| POST   | `/create-checkout-session`| `createCheckoutSession`  | Create Stripe session for plan subscription      |
| GET    | `/checkout-success`       | `checkoutSuccess`        | Process successful payment, provision org        |

**Plan Prices (GBP pence):** `starter` = 500, `pro` = 1500, `enterprise` = 5000.

### 6.8 Debug Email (`/api/debug/email`)

| Method | Path                    | Purpose                              |
| ------ | ----------------------- | ------------------------------------ |
| POST   | `/test-tenant-email`    | Test tenant onboarding email         |
| POST   | `/test-org-email`       | Test org welcome email               |
| GET    | `/email-config-status`  | Check active email provider          |
| GET    | `/verify-smtp`          | Verify Gmail SMTP connectivity       |

### 6.9 Health Check

| Method | Path      | Purpose                                             |
| ------ | --------- | --------------------------------------------------- |
| GET    | `/health` | DB connectivity check. Returns 200 OK or 500 Error  |

---

## 7. Backend — Models

All models reside in `backend/src/models/`. All org-scoped models are **static classes** where every method accepts `pool` as the first argument. No `org_id` column filtering is needed because each org has its own database schema.

### User.js

**Org-scoped methods:**

| Method                              | SQL Operation                                              |
| ----------------------------------- | ---------------------------------------------------------- |
| `create(pool, name, email, password, role)` | Hash password with bcrypt, INSERT into `users`, RETURN  |
| `findByEmail(pool, email)`          | SELECT * FROM `users` WHERE email = $1                    |
| `findById(pool, id)`                | SELECT id, name, email, role, is_first_login WHERE id = $1 |
| `findAll(pool)`                     | SELECT all users ORDER BY created_at DESC                  |
| `changePassword(pool, id, newPwd)`  | Hash, UPDATE, set is_first_login = FALSE                  |
| `updatePassword(pool, id, newPwd)`  | Hash, UPDATE (is_first_login unchanged)                   |

**Master DB methods:**

| Method                                     | Operation                                                  |
| ------------------------------------------ | ---------------------------------------------------------- |
| `createSuperAdmin(name, email, password)`  | INSERT into `users` with role = 'super_admin'             |
| `findSuperAdminByEmail(email)`             | Find in master `users` table                              |
| `findSuperAdminById(id)`                   | Find in master `users` table by id                        |
| `addOrgMapping(email, orgId, userId, role)`| INSERT/UPDATE `user_org_map`                              |
| `removeOrgMapping(email, orgId)`           | DELETE from `user_org_map`                                |
| `findOrgsByEmail(email)`                   | JOIN `user_org_map` + `organizations` → list of user's orgs |

### Building.js

| Method                              | Notes                                                               |
| ----------------------------------- | ------------------------------------------------------------------- |
| `findAll(pool)`                     | ORDER BY id                                                         |
| `findById(pool, id)`                | —                                                                   |
| `create(pool, name, location)`      | INSERT, RETURN                                                      |
| `update(pool, id, name, location)`  | UPDATE, RETURN                                                      |
| `delete(pool, id)`                  | Cascades: payments → users (tenants) → beds → rooms → building     |

### Room.js

| Method                                                      | Notes                                                      |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| `findAll(pool)`                                             | ORDER BY id                                                |
| `findByBuilding(pool, buildingId)`                          | ORDER BY room_number                                       |
| `findById(pool, id)`                                        | —                                                          |
| `create(pool, buildingId, roomNumber, capacity, floor?)`    | Auto-computes floor from room number prefix if not given   |
| `update(pool, id, buildingId, roomNumber, capacity, floor?)`| Same logic                                                 |
| `delete(pool, id)`                                          | Transaction: payments → tenants → users → beds → room      |
| `getFloorLayout(pool, buildingId)`                          | Grouped by floor, bed counts per room                      |
| `getFloorLayoutWithBeds(pool, buildingId)`                  | Nested: floor → rooms → individual beds + tenant names     |
| `extractFloorFromRoomNumber(roomNumber)`                    | Static helper — e.g., 101 → floor 1, 201 → floor 2        |

### Bed.js

| Method                                        | Notes                                         |
| --------------------------------------------- | --------------------------------------------- |
| `findAll(pool)`                               | ORDER BY id                                   |
| `findByRoom(pool, roomId)`                    | ORDER BY id                                   |
| `findById(pool, id)`                          | —                                             |
| `findVacantByRoom(pool, roomId)`              | WHERE status = 'vacant'                       |
| `create(pool, roomId, bedIdentifier, status)` | Default status = 'vacant'                     |
| `update(pool, id, roomId, bedIdentifier, status)` | —                                         |
| `updateStatus(pool, id, status)`              | Update only status field                      |
| `delete(pool, id)`                            | Cascades: payments → tenants → users → bed    |

### Tenant.js

| Method                                                                        | Notes                              |
| ----------------------------------------------------------------------------- | ---------------------------------- |
| `create(pool, userId, email, bedId, startDate, endDate, rent, phone)`         | INSERT, RETURN                     |
| `findByUserId(pool, userId)`                                                  | Returns single or null             |
| `findById(pool, id)`                                                          | —                                  |
| `findAll(pool)`                                                               | JOIN: users, beds, rooms, buildings|
| `update(pool, id, updates)`                                                   | Dynamic SET clause                 |
| `delete(pool, id)`                                                            | DELETE                             |

### Payment.js

| Method                                          | Notes                                                      |
| ----------------------------------------------- | ---------------------------------------------------------- |
| `create(pool, {...})`                           | INSERT with tenantId, amount, month, year, razorpayId, etc.|
| `findByTenantId(pool, tenantId)`                | ORDER BY year DESC, month DESC                             |
| `findByMonth(pool, month, year)`                | All payments for a given month                             |
| `findExisting(pool, tenantId, month, year)`     | Duplicate check                                            |
| `findAll(pool)`                                 | ORDER BY year DESC, month DESC, date DESC                  |
| `updateStatus(pool, id, status)`                | Update status field                                        |

### Organization.js (Master DB)

| Method                     | Notes                                                              |
| -------------------------- | ------------------------------------------------------------------ |
| `create(...)`              | INSERT with plan, slug, org details                                |
| `findById(id)`             | —                                                                  |
| `findBySlug(slug)`         | —                                                                  |
| `findByEmail(email)`       | —                                                                  |
| `findAll()`                | ORDER BY created_at DESC                                           |
| `update(id, updates)`      | Dynamic SET clause                                                 |
| `updatePlan(id, plan)`     | Fetches plan_limits, updates org's limit columns                   |
| `updateStatus(id, status)` | —                                                                  |
| `delete(id)`               | DELETE                                                             |
| `getStats(id)`             | Query org pool for buildings, beds, occupancy, rooms, users, tenants|
| `getPlanLimits(plan)`      | SELECT from `plan_limits`                                          |
| `getAllPlanLimits()`        | All plans ORDER BY price_monthly                                   |

### Subscription.js (Master DB)

| Method                     | Notes                                   |
| -------------------------- | --------------------------------------- |
| `create(orgId, plan, amount, billingCycle)` | Compute period dates, INSERT  |
| `findByOrgId(orgId)`       | Most recent subscription for org        |
| `findAll()`                | JOIN organizations for name/email       |
| `update(id, updates)`      | Dynamic SET, updated_at                 |
| `cancel(id)`               | SET status = 'cancelled'                |

### Invoice.js (Master DB)

| Method                              | Notes                             |
| ----------------------------------- | --------------------------------- |
| `create(orgId, subId, amount, desc, dueDate)` | INSERT, RETURN              |
| `findByOrgId(orgId)`                | ORDER BY invoice_date DESC         |
| `findAll()`                         | JOIN organizations                |
| `markPaid(id, razorpayPaymentId)`   | UPDATE status = 'paid', paid_at   |
| `updateStatus(id, status)`          | —                                 |

### AuditLog.js (Per-org)

| Method                                                             | Notes                                  |
| ------------------------------------------------------------------ | -------------------------------------- |
| `create(pool, userId, action, entityType, entityId, details, ip)` | INSERT into `audit_logs`              |
| `findAll(pool, limit=50, offset=0)`                                | LEFT JOIN users, ORDER BY created_at DESC |

---

## 8. Backend — Middleware

### auth.js

**`authenticateToken(req, res, next)`**
- Extracts JWT from `Authorization: Bearer <token>` header.
- Verifies with `JWT_SECRET`.
- On success: injects `req.user = { id, role, orgId }`.
- On failure: `401 Access denied` or `403 Invalid token`.

**`authorizeRole(roles)`**
- Checks `req.user.role` is in allowed roles array.
- On failure: `403 Forbidden`.

### tenantIsolation.js

**`tenantIsolation(req, res, next)`**
- For `super_admin`: reads optional `x-org-id` request header to switch org context.
- For others: reads `req.user.orgId`.
- Queries master DB to verify org exists and `status = 'active'`.
- Injects `req.orgId`, `req.orgName`, `req.orgPlan`, `req.pool` (org-specific DB pool).
- Returns `404` if org not found, `403` if org is suspended.

**`checkPlanLimits(resourceType)`**
- After `tenantIsolation` runs.
- Counts existing resources (buildings, beds, users) in org's DB pool.
- Compares against `plan_limits` for the org's plan.
- Returns `403` with plan upgrade info if limit exceeded.
- Skips check if plan limit is `-1` (unlimited).

**`superAdminOnly(req, res, next)`**
- Checks `req.user.role === 'super_admin'`.
- On failure: `403 Super admin access required`.

---

## 9. Backend — Services

### DatabaseManager.js

Singleton service managing all database connections.

**Two modes:**
- **Multi-DB** (local dev, `USE_SINGLE_DB=false`): Each org has its own PostgreSQL database (`pg_stay_{orgname}_{orgId}`).
- **Single-DB/Schema** (production, `USE_SINGLE_DB=true`): All orgs share one database. Each org gets a schema named `org_{orgId}`. Queries are scoped via the `SchemaPool` wrapper which sets `search_path` on every connection.

**Key Methods:**

| Method                        | Description                                                          |
| ----------------------------- | -------------------------------------------------------------------- |
| `initMasterPool()`            | Initialize master DB pool (organizations, subscriptions, etc.)       |
| `getMasterPool()`             | Return cached master pool                                            |
| `getOrgPool(orgId)`           | Return cached org pool (create if first access)                      |
| `createOrgDatabase(orgId, orgName)` | Create new DB/schema for org, initialize tables, cache pool   |
| `getAllOrgPools()`             | Return `[{orgId, pool}]` for all active orgs                        |
| `deleteOrgDatabase(orgId)`    | Drop schema (single-DB) or DROP DATABASE (multi-DB)                  |
| `destroyOrgPool(orgId)`       | Remove pool from cache, call `pool.end()`                            |

**SchemaPool** — Wraps a real `pg.Pool` and intercepts `connect()` to set `SET search_path = org_{orgId}` before every connection. Transparent to all calling code.

### emailService.js

**Provider selection:** Checks for `RESEND_API_KEY` first; falls back to `EMAIL_USER` + `EMAIL_PASSWORD` (Gmail SMTP).

**Functions:**

| Function                      | Subject                                                          |
| ----------------------------- | ---------------------------------------------------------------- |
| `sendEmail(to, subject, html)`| Low-level send (Resend → SMTP fallback)                         |
| `sendTenantCredentials`       | "🎉 Welcome to {orgName} - Your Login Credentials"              |
| `sendThankYouEmail`           | "🙏 Thank You For Your Stay"                                    |
| `sendPaymentReminder`         | "⚠️ Rent Payment Reminder for {monthName}"                      |
| `sendRentReceipt`             | "💰 Rent Receipt - {monthName}"                                 |
| `sendOrgWelcomeEmail`         | "🎉 Welcome to RoomiPilot"                                       |
| `sendStayExtensionReminder`   | "⏰ Stay Extension Reminder"                                    |
| `sendDeactivationEmail`       | "👋 Account Deactivation"                                       |

All functions return `boolean` (true = success, false = failure). Errors are logged but never crash the request.

### checkoutScheduler.js

- Cron: `5 0 * * *` — Runs daily at **00:05 UTC**.
- Iterates all active org pools via `getAllOrgPools()`.
- Calls `processTenantCheckouts(pool, orgId)` for each org.

### stayExtensionScheduler.js

- Cron: `30 11 * * *` — Runs daily at **11:30 UTC (5:00 PM IST)**.
- Iterates all active org pools.
- Queries `WHERE DATE(end_date) = CURRENT_DATE + INTERVAL '3 days'`.
- Sends `sendStayExtensionReminder` to each matching tenant.

### tenantCheckoutService.js

**`processTenantCheckouts(orgPool, orgId)`**
1. Query tenants where `DATE(end_date) = CURRENT_DATE`.
2. For each tenant: calculate stay duration, get bed info, send thank you email (non-blocking).
3. Update bed status to `vacant`.
4. DELETE payments, DELETE tenant.
5. Return `{success, checkouts, failures, results[]}`.

### OrgDatabaseInitializer.js

- **Only used in multi-DB mode.**
- On startup: scans all active orgs in master DB.
- Checks if each org's database exists.
- Creates missing databases and applies `schema.sql`.
- Used during local dev migrations.

---

## 10. Frontend — Pages & Components

### Pages (`frontend/src/pages/`)

| File                       | Route                     | Description                                                              |
| -------------------------- | ------------------------- | ------------------------------------------------------------------------ |
| `GuestView.jsx`            | `/`, `/:orgSlug`          | Public property listing. Browse buildings, rooms, vacancies without login.|
| `Login.jsx`                | `/login`                  | Email + password login with org slug. Handles multi-org selection.       |
| `Register.jsx`             | `/register`               | Tenant self-registration form (requires org slug in URL query).          |
| `Onboarding.jsx`           | `/onboarding`             | SaaS org registration wizard. Collects org + admin details + plan choice.|
| `OnboardingSuccess.jsx`    | `/onboarding/success`     | Shown after Stripe payment success. Confirms org is live.                |
| `AdminDashboard.jsx`       | `/admin`                  | Main admin console: occupancy, floor layout, tenant list, checkout.      |
| `PropertyManagement.jsx`   | `/property-management`    | CRUD interface for buildings, rooms, beds. Inline form modals.           |
| `PaymentInfo.jsx`          | `/payment-info`           | Monthly payment status report. Filters by month. Export CSV/Excel/PDF.   |
| `TenantPaymentSearch.jsx`  | `/tenant-payment-search`  | Admin search for any tenant's full payment history grid.                 |
| `TenantDashboard.jsx`      | `/tenant`                 | Tenant portal: profile, stay info, payment history, online payment.      |
| `SuperAdminDashboard.jsx`  | `/super_admin`            | Platform console: orgs, stats, plans, inactive users, billing.           |
| `OrgSettings.jsx`          | `/org-settings`           | Org profile, subscription, invoices, audit logs, user management.        |
| `Messenger.jsx`            | `/messenger`              | Bulk email to tenants filtered by building/floor/room/all.               |
| `ContactUs.jsx`            | `/contact`                | Contact/support form.                                                    |

### Components (`frontend/src/components/`)

| File                        | Description                                                              |
| --------------------------- | ------------------------------------------------------------------------ |
| `Header.jsx`                | Navigation bar with user info, role-based links, logout.                 |
| `FloorOccupancyVisual.jsx`  | Visual grid rendering floors → rooms → beds with colour-coded status.    |
| `AvailabilityModal.jsx`     | Modal showing bed/vacancy details for a selected room or building.       |
| `ChangePasswordModal.jsx`   | OTP-based password change dialog.                                        |
| `TenantCredentialsModal.jsx`| Displays generated credentials after tenant creation.                    |
| `LanguageSwitcher.jsx`      | Dropdown to switch language (en/hi/te) and region (IN/UK).               |
| `Toast.jsx`                 | Global notification component for success/error/info messages.           |

---

## 11. Frontend — State & API Layer

### api.js (`frontend/src/services/api.js`)

```javascript
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

// Auto-attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

**Helper exports:**

| Function            | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `getOrgSlug()`      | Read `organization.slug` from localStorage           |
| `getOrganization()` | Read full org object from localStorage               |
| `setAuthData(token, user, org)` | Persist auth data to localStorage         |
| `clearAuthData()`   | Clear all auth keys from localStorage (logout)       |
| `getUser()`         | Read current user from localStorage                  |

### LanguageContext.jsx (`frontend/src/context/`)

**Context values:**

| Value              | Description                                         |
| ------------------ | --------------------------------------------------- |
| `language`         | `'en'` \| `'hi'` \| `'te'` (persisted in localStorage) |
| `region`           | `'IN'` \| `'UK'` (persisted in localStorage)       |
| `changeLanguage()` | Switch language and reload translations             |
| `changeRegion()`   | Switch region                                       |

**Hooks:**

| Hook             | Returns                                                |
| ---------------- | ------------------------------------------------------ |
| `useLanguage()`  | `{ language, changeLanguage, region, changeRegion }`   |
| `useCurrency()`  | `{ currencySymbol, currencyCode, region }` — `IN` → `₹ INR`, `UK` → `£ GBP` |

### State Management Pattern

- No Redux or external state library.
- Component-local state via `useState`.
- Shared state (language, region, auth) via `localStorage` + React Context.
- No server-side state caching (no React Query); data is refetched on page load/action.

### Internationalization

Translation files in `frontend/src/locales/`:

| File      | Language |
| --------- | -------- |
| `en.json` | English  |
| `hi.json` | Hindi    |
| `te.json` | Telugu   |

Usage in components: `<FormattedMessage id="auth.login" defaultMessage="Login" />`  
Nested JSON keys are flattened: `{ auth: { login: "Login" } }` → key `"auth.login"`.

### Export Utilities (`frontend/src/services/exportUtils.js`)

| Function                     | Output     | Notes                                              |
| ---------------------------- | ---------- | -------------------------------------------------- |
| `exportAsCSV(...)`           | `.csv`     | Blob download via anchor click                     |
| `exportAsExcel(...)`         | `.xlsx`    | Uses SheetJS, column widths auto-set               |
| `exportAsPDF(...)`           | `.pdf`     | Landscape A4, summary stats box, alternating rows, page numbers |
| `exportPaymentData(format, ...)` | —      | Router — calls the above three based on format     |

---

## 12. Email Notifications

| Trigger                        | Recipient | Email Function               |
| ------------------------------ | --------- | ---------------------------- |
| Tenant account created         | Tenant    | `sendTenantCredentials`      |
| Tenant checkout (auto/manual)  | Tenant    | `sendThankYouEmail`          |
| Admin sends payment reminder   | Tenant    | `sendPaymentReminder`        |
| Offline/online payment recorded| Tenant    | `sendRentReceipt`            |
| Org registration complete      | Admin     | `sendOrgWelcomeEmail`        |
| 3 days before stay ends (cron) | Tenant    | `sendStayExtensionReminder`  |
| Account deactivated by admin   | Tenant    | `sendDeactivationEmail`      |
| OTP requested                  | User      | OTP email (inline, no helper)|
| Inactive user reminder         | User      | "We miss you" email (inline) |

---

## 13. Scheduled Jobs

| Job                     | Schedule (UTC)    | Logic                                                                  |
| ----------------------- | ----------------- | ---------------------------------------------------------------------- |
| Checkout Scheduler      | `5 0 * * *`       | Process tenants with `end_date = TODAY`. Vacate bed, delete record.    |
| Stay Extension Reminder | `30 11 * * *`     | Notify tenants whose `end_date = TODAY + 3 days`. Runs at 5 PM IST.   |

Both jobs iterate all active org pools via `DatabaseManager.getAllOrgPools()` and operate org-by-org.

---

## 14. Database Schema

### Master Database Tables

**`organizations`**
```
id SERIAL PK, name, slug UNIQUE, email, phone, address,
plan (free/starter/pro/enterprise), status (active/suspended),
max_properties, max_beds, max_users,
database_name VARCHAR, created_at
```

**`plan_limits`**
```
plan UNIQUE PK, max_properties, max_beds, max_users,
price_monthly DECIMAL, price_yearly DECIMAL,
features JSONB, created_at
```

**`subscriptions`**
```
id SERIAL PK, org_id FK → organizations,
plan, status (active/cancelled/expired),
amount DECIMAL, billing_cycle (monthly/yearly),
stripe_subscription_id, stripe_customer_id,
current_period_start, current_period_end, created_at
```

**`invoices`**
```
id SERIAL PK, org_id FK → organizations,
subscription_id FK → subscriptions,
amount DECIMAL, status (pending/paid/failed),
description, due_date, paid_at,
razorpay_payment_id, invoice_date, created_at
```

**`users`** (master — super_admin only)
```
id SERIAL PK, name, email UNIQUE,
password (bcrypt hashed), role CHECK 'super_admin', created_at
```

**`user_org_map`**
```
id SERIAL PK, email, org_id FK, user_id,
role, created_at, UNIQUE(email, org_id)
```

### Per-Org Database/Schema Tables

**`users`**
```
id SERIAL PK, name, email UNIQUE, password (bcrypt hashed),
role CHECK (admin/tenant/guest),
is_first_login BOOLEAN DEFAULT TRUE,
last_active TIMESTAMP, created_at
```

**`buildings`**
```
id SERIAL PK, name, location, created_at
```

**`rooms`**
```
id SERIAL PK, building_id FK → buildings,
room_number, floor_number, capacity INT, created_at
```

**`beds`**
```
id SERIAL PK, room_id FK → rooms,
bed_identifier, status CHECK (occupied/vacant), created_at
```

**`tenants`**
```
id SERIAL PK, user_id FK → users,
email, phone, bed_id FK → beds,
start_date DATE, end_date DATE,
rent DECIMAL, created_at
```

**`payments`**
```
id SERIAL PK, tenant_id FK → tenants,
tenant_name, email, phone, amount DECIMAL, status,
payment_month INT, payment_year INT, payment_date TIMESTAMP,
razorpay_payment_id,
UNIQUE(tenant_id, payment_month, payment_year)
```

**`audit_logs`**
```
id SERIAL PK, user_id, action, entity_type, entity_id,
details JSONB, ip_address, created_at
```

---

## 15. API Reference Summary

Full interactive documentation is available at `/api-docs` (Swagger UI) and `/api-docs.json` (OpenAPI JSON).

**Authentication:** All protected endpoints require `Authorization: Bearer <jwt_token>` header.

**Response format:**
- Success: JSON object with relevant data.
- Error: `{ "message": "Human-readable error" }` with appropriate HTTP status.

**HTTP Status Codes used:**

| Code | Meaning                                      |
| ---- | -------------------------------------------- |
| 200  | OK                                           |
| 201  | Created                                      |
| 300  | Multiple orgs found (multi-org login)        |
| 400  | Bad Request (missing/invalid fields)         |
| 401  | Unauthorized (no/invalid token)              |
| 403  | Forbidden (role mismatch, org suspended, plan limit) |
| 404  | Not Found                                    |
| 500  | Internal Server Error                        |

---

## 16. Deployment

### Backend — Railway

- Service type: Node.js web service.
- Build: `npm install`
- Start: `npm start` (`node server.js`)
- Port: `5000` (or `PORT` env var)
- Database: Railway PostgreSQL add-on (single shared DB).
- `USE_SINGLE_DB=true` activates schema-mode multi-tenancy.
- CORS whitelist includes the Vercel frontend URL.

### Frontend — Vercel

- Build: `cd frontend && npm install && npm run build`
- Output: `frontend/dist`
- Framework: Vite
- All routes rewrite to `/index.html` for SPA client-side routing.
- `VITE_API_URL` env var must be set to the Railway backend URL.

---

## 17. Environment Variables

### Backend (`backend/.env.production.example`)

| Variable               | Description                                                 |
| ---------------------- | ----------------------------------------------------------- |
| `NODE_ENV`             | `production` or `development`                               |
| `PORT`                 | Server port (default 5000)                                  |
| `DATABASE_URL`         | PostgreSQL connection string                                 |
| `JWT_SECRET`           | Secret key for JWT signing                                  |
| `EMAIL_USER`           | Gmail address for SMTP fallback                             |
| `EMAIL_PASSWORD`       | Gmail app password                                          |
| `RESEND_API_KEY`       | Resend API key (primary email provider)                     |
| `RAZORPAY_KEY_ID`      | Razorpay API key ID for rent payments                       |
| `RAZORPAY_KEY_SECRET`  | Razorpay API secret                                         |
| `STRIPE_SECRET_KEY`    | Stripe secret key for subscription payments                 |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key                                    |
| `FRONTEND_URL`         | Vercel frontend URL (for CORS and email links)              |
| `USE_SINGLE_DB`        | `true` for single-DB/schema production mode                 |

### Frontend (`frontend/.env.production.example`)

| Variable        | Description                           |
| --------------- | ------------------------------------- |
| `VITE_API_URL`  | Full URL of backend API (with `/api`) |

---

## 18. Local Development Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd pg-stay

# 2. Backend setup
cd backend
npm install
# Create .env file (reference backend/.env.production.example)
npm run dev        # Starts on http://localhost:5000

# 3. Frontend setup (new terminal)
cd frontend
npm install
# Create .env file: VITE_API_URL=http://localhost:5000/api
npm run dev        # Starts on http://localhost:5173

# 4. PostgreSQL
# Ensure PostgreSQL is running locally on port 5432
# The master database tables are auto-created on first backend start
# Org databases are created automatically when an org registers
```

**Default credentials (development):**
- Super Admin: `superadmin@pgstay.com` / `superadmin123`
- Demo Admin: `admin@roomipilot.com` / `admin123`

---

## 19. Development Workflow & Quality Gates

### Feature Development
1. Create a feature branch from `main`. Never commit directly to `main`.
2. Follow existing architecture: Route → Controller → Model (backend), Page/Component (frontend).
3. All SQL queries must use parameterized placeholders (`$1`, `$2`). No string interpolation of user input.

### Test Cases (Mandatory)
Every feature must have tests before it is considered complete:
- **Unit tests** — Models and utility functions.
- **Integration tests** — Full API request-response cycle for each endpoint.
- **Component tests** — React pages/components with user interaction simulations.
- **Edge cases** — Invalid input, unauthorized access, missing data, duplicate entries.
- **Tenant isolation tests** — Verify one org's data cannot be accessed by another.

### Code Review (Mandatory)
All code goes through a pull request before merging. Reviewers verify:
- Naming and coding conventions are followed.
- Error handling and input validation are correct.
- No hardcoded secrets or credentials.
- Parameterized SQL (no injection risk).
- Tenant isolation is maintained.
- Tests are written and passing.
- No unnecessary dependencies.

### Security Scanning (Mandatory)
Before any deployment:
- Check OWASP Top 10:
  - **Injection** — All SQL is parameterized.
  - **Broken Authentication** — JWT on every protected route, bcrypt for passwords.
  - **Sensitive Data Exposure** — No secrets in code/logs. Use env vars only.
  - **Broken Access Control** — `authorizeRole` on every restricted endpoint.
  - **Security Misconfiguration** — CORS whitelist maintained. No internal error details in responses.
  - **XSS** — React JSX auto-escapes. No `dangerouslySetInnerHTML` with user data.
  - **CSRF** — Token-based auth (not cookies) reduces risk.
- Run `npm audit` in both `backend/` and `frontend/`.
- No `eval()` or `Function()` from user input.
- Never commit `.env` files.

### Deployment Checklist
- [ ] All tests pass.
- [ ] Code review approved.
- [ ] Security scan clean (`npm audit`).
- [ ] Environment variables configured in Railway/Vercel dashboards.
- [ ] Database migrations applied if schema changed.
- [ ] CORS whitelist updated if frontend URL changed.
