# PG Stay — Architecture Documentation

> **Version:** 1.0  
> **Last Updated:** April 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture Diagram](#2-high-level-architecture-diagram)
3. [Multi-Tenancy Architecture](#3-multi-tenancy-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Database Architecture](#6-database-architecture)
7. [Authentication & Authorization Flow](#7-authentication--authorization-flow)
8. [Request Lifecycle](#8-request-lifecycle)
9. [Payment Architecture](#9-payment-architecture)
10. [Email Delivery Architecture](#10-email-delivery-architecture)
11. [Scheduled Jobs Architecture](#11-scheduled-jobs-architecture)
12. [Data Flow Diagrams](#12-data-flow-diagrams)
13. [Security Architecture](#13-security-architecture)
14. [Deployment Architecture](#14-deployment-architecture)
15. [Key Architectural Decisions & Trade-offs](#15-key-architectural-decisions--trade-offs)
16. [Folder & File Structure Reference](#16-folder--file-structure-reference)

---

## 1. System Overview

PG Stay is organized as a **monorepo** with two independently deployable applications:

```
pg-stay/
├── backend/        → Node.js / Express API server
├── frontend/       → React SPA (Single Page Application)
├── database/       → SQL schema files
├── tests/          → Test suites
└── docs/           → Documentation (this file)
```

The two applications communicate exclusively over HTTP via a REST API. The backend owns all database access. The frontend is a stateless client that reads/writes data via API calls and stores auth tokens in browser `localStorage`.

---

## 2. High-Level Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                  │
│                                                                  │
│  Browser (Admin)    Browser (Tenant)    Browser (Public Guest)  │
└──────────┬──────────────────┬──────────────────┬───────────────┘
           │                  │                  │
           │    HTTPS (REST API calls via Axios)  │
           ▼                  ▼                  ▼
┌───────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel CDN)                        │
│                                                                  │
│  React 18 + Vite + Tailwind CSS + React Router v6               │
│  react-intl (i18n: en/hi/te)  |  jsPDF + SheetJS (export)      │
│  Axios instance with JWT interceptor                             │
│  LocalStorage: token, user, organization                         │
└──────────────────────────┬────────────────────────────────────┘
                           │ HTTPS REST calls
                           │ Authorization: Bearer <jwt>
                           ▼
┌───────────────────────────────────────────────────────────────┐
│                BACKEND API SERVER (Railway)                     │
│                                                                  │
│  Express.js 5.x — server.js                                     │
│                                                                  │
│  ┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │  Middleware   │  │    Routes        │  │   Controllers    │  │
│  │               │  │                  │  │                  │  │
│  │ authenticateToken│ /api/auth       │  │ authController   │  │
│  │ authorizeRole │  │ /api/admin       │  │ adminController  │  │
│  │ tenantIsolation│  │ /api/tenant     │  │ tenantController │  │
│  │ checkPlanLimits│  │ /api/guest      │  │ guestController  │  │
│  │ superAdminOnly │  │ /api/super-admin│  │ superAdminCtrl   │  │
│  └───────────────┘  │ /api/organization│  │ orgController    │  │
│                      │ /api/stripe      │  │ stripeController │  │
│                      │ /api-docs        │  │ debugController  │  │
│                      │ /health          │  │                  │  │
│                      └─────────────────┘  └──────────────────┘  │
│                                                    │             │
│  ┌──────────────────────────────────────────────┐ │             │
│  │                 Models                        │◄┘             │
│  │  User, Building, Room, Bed, Tenant, Payment,  │               │
│  │  Organization, Subscription, Invoice, AuditLog│               │
│  └──────────────────────┬───────────────────────┘               │
│                          │ SQL (parameterized)                   │
│  ┌──────────────────────▼───────────────────────┐               │
│  │              DatabaseManager                  │               │
│  │   (Singleton — manages all DB pools)          │               │
│  │   Master Pool + Per-Org Pools (Map<orgId,Pool>)│              │
│  └──────────────────────┬───────────────────────┘               │
└─────────────────────────┼──────────────────────────────────────┘
                          │ TCP (PostgreSQL wire protocol)
                          ▼
┌───────────────────────────────────────────────────────────────┐
│            POSTGRESQL DATABASE (Railway Postgres)              │
│                                                                  │
│  ┌────────────────────┐   ┌─────────────────────────────────┐  │
│  │   Master Schema     │   │   Per-Org Schemas                │  │
│  │  (public schema)    │   │   org_1, org_2, org_3 ...        │  │
│  │                     │   │                                  │  │
│  │  organizations      │   │  users, buildings, rooms,        │  │
│  │  plan_limits        │   │  beds, tenants, payments,        │  │
│  │  subscriptions      │   │  audit_logs                      │  │
│  │  invoices           │   │                                  │  │
│  │  users (super_admin)│   │  (No org_id columns — isolation  │  │
│  │  user_org_map       │   │   enforced by schema boundary)   │  │
│  └────────────────────┘   └─────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘

External Services:
  ┌─────────────┐  ┌────────────┐  ┌──────────────────────────┐
  │  Razorpay   │  │  Stripe    │  │  Resend API / Gmail SMTP │
  │ (Rent pay)  │  │ (Subscrib) │  │  (Email notifications)   │
  └─────────────┘  └────────────┘  └──────────────────────────┘
```

---

## 3. Multi-Tenancy Architecture

### Tenancy Model

PG Stay uses **database-level isolation** for each organization (tenant of the SaaS platform). Each org's data (users, buildings, rooms, beds, tenants, payments, audit logs) is stored in an isolated container.

### Two Deployment Modes

#### Mode 1 — Multi-Database (Local Development)

```
PostgreSQL Server
├── master_db (hostel_management)
│   ├── organizations
│   ├── subscriptions
│   ├── invoices
│   ├── users (super_admin)
│   └── user_org_map
│
├── pg_stay_greenfield_1       ← Org "Greenfield" (id=1)
│   ├── users
│   ├── buildings
│   ├── rooms
│   ├── beds
│   ├── tenants
│   ├── payments
│   └── audit_logs
│
└── pg_stay_sunrisehostel_2    ← Org "Sunrise Hostel" (id=2)
    ├── users
    └── ...
```

- Controlled by: `USE_SINGLE_DB=false` (default in local)
- Each org gets a separate PostgreSQL database.
- DatabaseManager creates a new `pg.Pool` per org database.

#### Mode 2 — Single-Database/Schema (Production — Railway)

```
PostgreSQL Server (single DB: pgstay_prod)
│
├── public schema
│   ├── organizations
│   ├── plan_limits
│   ├── subscriptions
│   ├── invoices
│   ├── users (super_admin)
│   └── user_org_map
│
├── org_1 schema               ← Org id=1
│   ├── users
│   ├── buildings
│   └── ...
│
└── org_2 schema               ← Org id=2
    ├── users
    └── ...
```

- Controlled by: `USE_SINGLE_DB=true`
- All orgs share a single PostgreSQL database, each in its own named schema (`org_{id}`).
- **SchemaPool** wraps the master pool and issues `SET search_path = org_{id}` on every connection acquire.
- This transparently scopes all queries to the correct schema without any code change in models.

### SchemaPool — Transparent Schema Routing

```javascript
class SchemaPool {
  constructor(masterPool, schemaName) {
    this.masterPool = masterPool;
    this.schemaName = schemaName;   // e.g. "org_3"
  }

  async connect() {
    const client = await this.masterPool.connect();
    await client.query(`SET search_path = ${this.schemaName}`);
    return client;
  }

  async query(text, params) {
    const client = await this.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }
}
```

Models call `pool.query(...)` without knowing which schema they're in. The SchemaPool intercepts and scopes automatically.

### Pool Cache

`DatabaseManager` maintains an in-memory `Map<orgId, Pool>` so each org's pool is created once and reused. Pools are evicted when an org is deleted or the server restarts.

```
Request comes in for org_5
  → Check pools Map → MISS
  → Single-DB mode: create SchemaPool for "org_5"
  → Store in Map[5]
  → Return pool to middleware

Next request for org_5
  → Check pools Map → HIT
  → Return cached pool
```

### Tenant Isolation Middleware

Every request that touches org-specific data passes through `tenantIsolation`:

```
Request → authenticateToken (decode JWT, get orgId)
        → tenantIsolation:
              1. Read orgId from JWT (or x-org-id header for super_admin)
              2. Query master DB: SELECT * FROM organizations WHERE id = $1
              3. Verify status = 'active'
              4. Call DatabaseManager.getOrgPool(orgId)
              5. Attach pool to req.pool
        → Controller (uses req.pool for all DB calls)
```

No controller directly queries the master database for org data — all org operations go through `req.pool`.

---

## 4. Backend Architecture

### Layer Diagram

```
HTTP Request
     │
     ▼
server.js (Express App)
     │
     ├── CORS middleware (whitelist check)
     ├── express.json() (body parser)
     │
     ▼
Route Handler (e.g., adminRoutes.js)
     │
     ├── authenticateToken   → Validates JWT, sets req.user
     ├── authorizeRole       → Role check (admin/tenant/super_admin)
     ├── tenantIsolation     → Resolves org from req.user.orgId, sets req.pool
     ├── checkPlanLimits     → (Optional) Enforces plan resource limits
     │
     ▼
Controller Function (e.g., adminController.createTenant)
     │
     ├── Input validation
     ├── Business logic
     ├── Call Model methods (pass req.pool)
     │
     ▼
Model (Static class e.g., Tenant.create(pool, ...))
     │
     ├── Parameterized SQL query
     ├── Execute via pool.query($1, $2, ...)
     │
     ▼
DatabaseManager (SchemaPool / dedicated Pool)
     │
     ▼
PostgreSQL
     │
     ▼
Controller receives result
     │
     ▼
HTTP Response (JSON)
```

### File Organization

```
backend/
├── server.js                    ← Express setup, master DB init, schedulers
├── swagger.js                   ← OpenAPI 3.0 config
└── src/
    ├── config/
    │   └── database.js          ← Master pool initialization helper
    ├── routes/
    │   ├── authRoutes.js
    │   ├── adminRoutes.js
    │   ├── tenantRoutes.js
    │   ├── guestRoutes.js
    │   ├── superAdminRoutes.js
    │   ├── organizationRoutes.js
    │   ├── stripeRoutes.js
    │   └── debugEmailRoutes.js
    ├── controllers/
    │   ├── authController.js
    │   ├── adminController.js
    │   ├── tenantController.js
    │   ├── guestController.js
    │   ├── superAdminController.js
    │   ├── organizationController.js
    │   ├── stripeController.js
    │   └── debugController.js
    ├── models/
    │   ├── User.js
    │   ├── Building.js
    │   ├── Room.js
    │   ├── Bed.js
    │   ├── Tenant.js
    │   ├── Payment.js
    │   ├── Organization.js
    │   ├── Subscription.js
    │   ├── Invoice.js
    │   └── AuditLog.js
    ├── middleware/
    │   ├── auth.js              ← JWT + role middleware
    │   └── tenantIsolation.js   ← Org isolation + plan limits
    └── services/
        ├── DatabaseManager.js   ← Core multi-tenancy engine
        ├── OrgDatabaseInitializer.js
        ├── emailService.js
        ├── checkoutScheduler.js
        ├── stayExtensionScheduler.js
        └── tenantCheckoutService.js
```

### Server Initialization Sequence

```
1. Load .env
2. Initialize master DB pool (DatabaseManager.initMasterPool())
3. Create master tables if not exist:
   organizations, plan_limits, subscriptions, invoices, users, user_org_map
4. Insert default plan limits (free/starter/pro/enterprise)
5. Register all route handlers
6. Register Swagger UI at /api-docs
7. If NODE_ENV === 'production':
   a. Initialize all org schemas (single-DB mode)
   b. Start checkout scheduler (cron)
   c. Start stay extension scheduler (cron)
8. app.listen(PORT)
```

### Model Pattern (Static Class)

```javascript
// All models follow this exact pattern
class Tenant {
  // Every method takes pool as first arg
  static async create(pool, userId, email, bedId, startDate, endDate, rent, phone) {
    const result = await pool.query(
      `INSERT INTO tenants (user_id, email, bed_id, start_date, end_date, rent, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, email, bedId, startDate, endDate, rent, phone]
    );
    return result.rows[0];
  }

  static async findAll(pool) {
    const result = await pool.query(
      `SELECT t.*, u.name, u.email as user_email,
              b.bed_identifier, r.room_number, bld.name as building_name
       FROM tenants t
       JOIN users u ON t.user_id = u.id
       JOIN beds b ON t.bed_id = b.id
       JOIN rooms r ON b.room_id = r.id
       JOIN buildings bld ON r.building_id = bld.id
       ORDER BY bld.name, r.room_number, b.bed_identifier`
    );
    return result.rows;
  }
}
module.exports = Tenant;
```

**Rules:**
- Always parameterized: `$1`, `$2`, `$3` — no string interpolation.
- No `org_id` column filtering — isolation is at schema/database level.
- `pool` is always the first argument.
- Always returns `result.rows[0]` (single) or `result.rows` (multiple).

---

## 5. Frontend Architecture

### Architecture Style

The frontend is a **client-side SPA (Single Page Application)** with:
- No SSR (server-side rendering).
- Client-side routing via React Router v6.
- All data fetched from the backend API on demand (no caching layer).
- Auth state stored in `localStorage` (not HTTP-only cookies).

### Component Hierarchy

```
main.jsx
└── App.jsx (React Router, IntlProvider, LanguageContext)
    ├── / → GuestView.jsx
    ├── /login → Login.jsx
    ├── /register → Register.jsx
    ├── /onboarding → Onboarding.jsx
    ├── /onboarding/success → OnboardingSuccess.jsx
    ├── /admin → AdminDashboard.jsx
    │              ├── Header.jsx
    │              ├── FloorOccupancyVisual.jsx
    │              ├── AvailabilityModal.jsx
    │              ├── TenantCredentialsModal.jsx
    │              └── ChangePasswordModal.jsx
    ├── /property-management → PropertyManagement.jsx
    ├── /payment-info → PaymentInfo.jsx
    ├── /tenant-payment-search → TenantPaymentSearch.jsx
    ├── /tenant → TenantDashboard.jsx
    ├── /super_admin → SuperAdminDashboard.jsx
    ├── /org-settings → OrgSettings.jsx
    ├── /messenger → Messenger.jsx
    ├── /contact → ContactUs.jsx
    └── /:orgSlug → GuestView.jsx
```

### Data Flow Pattern

```
User Action (click, form submit)
        │
        ▼
Event Handler in Component (async function)
        │
        ├── setLoading(true)
        │
        ▼
API Call via api.js (Axios instance)
  → Auto-attaches JWT header
  → Sends HTTP request to backend
        │
        ▼ (await response)
        │
        ├── Success → setState(response.data)
        ├── Error   → setError(error.response.data.message)
        │
        ▼
        setLoading(false)
        │
        ▼
Re-render (React reconciliation)
```

### State Management Strategy

```
Global State (React Context)
  └── LanguageContext
        ├── language ('en'|'hi'|'te') ← localStorage
        └── region ('IN'|'UK')        ← localStorage

Persistent State (localStorage)
  ├── token          ← JWT string
  ├── user           ← JSON user object
  └── organization   ← JSON org object

Local Component State (useState)
  ├── loading        ← boolean
  ├── error          ← string
  ├── data           ← fetched array/object
  └── formData       ← form field values
```

No Redux, MobX, Zustand, or React Query. All server state is considered local to the component that fetches it.

### Routing & Authentication Enforcement

Routes are not protected by a route guard component. Instead, each page component independently checks auth by reading from `localStorage` via `getUser()` and redirects with `useNavigate()` if not authenticated. Future improvement could centralize this into a `ProtectedRoute` wrapper component.

### Build & Deployment

```
Vite build process:
  1. Read VITE_* env vars (from .env / Vercel env)
  2. Bundle React app + dependencies
  3. Tree-shake unused code
  4. Output to frontend/dist/

Vercel deployment:
  1. Run build command
  2. Serve static files from dist/
  3. All routes → /index.html (SPA rewrite rule)
```

---

## 6. Database Architecture

### Conceptual Entity-Relationship Diagram

```
MASTER DATABASE
                        ┌───────────────────────────────────────┐
                        │              organizations              │
                        │  id, name, slug, email, plan,          │
                        │  status, max_properties, max_beds,      │
                        │  max_users, database_name              │
                        └──────────────┬────────────────────────┘
                                       │1
                     ┌─────────────────┤
                     │                 │
                    *│                *│
          ┌──────────┴──────┐  ┌──────┴──────────┐
          │   subscriptions  │  │     invoices     │
          │  plan, status,   │  │  amount, status, │
          │  billing_cycle   │  │  razorpay_id     │
          └─────────────────┘  └─────────────────┘

                        ┌──────────────────────┐
                        │     user_org_map      │
                        │  email, org_id,       │
                        │  user_id, role        │
                        └──────────────────────┘


PER-ORG SCHEMA (replicated per org)

          ┌──────────────────────────────────────────────────┐
          │                    buildings                      │
          │              id, name, location                   │
          └────────────────────┬─────────────────────────────┘
                               │1
                              *│
          ┌────────────────────▼─────────────────────────────┐
          │                      rooms                        │
          │       id, building_id, room_number, floor_number, │
          │       capacity                                    │
          └────────────────────┬─────────────────────────────┘
                               │1
                              *│
          ┌────────────────────▼─────────────────────────────┐
          │                      beds                         │
          │         id, room_id, bed_identifier, status       │
          └──────────┬──────────────────────────────────────-┘
                     │1
                     │0..1 (one bed optionally has one tenant)
          ┌──────────▼──────────────────────────────────────-┐
          │                    tenants                        │
          │  id, user_id, email, phone, bed_id,              │
          │  start_date, end_date, rent                       │
          └──────────┬──────────────────────────────────────-┘
                     │1                  │1
                    *│                   │1
          ┌──────────▼──────┐  ┌────────▼────────────────────┐
          │    payments     │  │           users               │
          │  tenant_id,     │  │  id, name, email, password,   │
          │  amount, month, │  │  role, is_first_login         │
          │  year, status   │  │         (admin, tenant)       │
          └─────────────────┘  └─────────────────────────────┘

          ┌─────────────────────────────────────────────────-┐
          │                   audit_logs                      │
          │   user_id, action, entity_type, entity_id,        │
          │   details JSONB, ip_address, created_at           │
          └──────────────────────────────────────────────────┘
```

### Key Constraints

- `beds.status` — `CHECK (status IN ('occupied', 'vacant'))`
- `users.role` (per-org) — `CHECK (role IN ('admin', 'tenant', 'guest'))`
- `users.role` (master) — `CHECK (role = 'super_admin')`
- `payments` — `UNIQUE(tenant_id, payment_month, payment_year)` — one payment record per tenant per month
- `user_org_map` — `UNIQUE(email, org_id)` — one record per user per org
- `organizations.slug` — `UNIQUE` — URL-safe org identifier

### Schema Initialization Order

When a new org is created, `DatabaseManager._initOrgTables(pool)` runs this sequence:

```sql
1. CREATE TABLE users (...)
2. CREATE TABLE buildings (...)
3. CREATE TABLE rooms (..., FOREIGN KEY building_id → buildings)
4. CREATE TABLE beds (..., FOREIGN KEY room_id → rooms)
5. CREATE TABLE tenants (..., FOREIGN KEY bed_id → beds, user_id → users)
6. CREATE TABLE payments (..., FOREIGN KEY tenant_id → tenants)
7. CREATE TABLE audit_logs (...)
```

Each uses `CREATE TABLE IF NOT EXISTS` to be idempotent.

### Cascade Delete Strategy

Deletion cascades are handled **in application code** (models), not as `ON DELETE CASCADE` SQL constraints. This gives full control over the sequence and allows sending emails before deleting data.

| Delete Action          | Cascade Sequence                                              |
| ---------------------- | ------------------------------------------------------------- |
| Delete building        | payments → users (tenants) → beds → rooms → building          |
| Delete room            | payments → tenants → users (tenants) → beds → room            |
| Delete bed             | payments → tenants → users (tenants) → bed                   |
| Delete tenant          | payments → tenant → user (in org) → user_org_map (master)    |
| Delete org             | user_org_map → subscriptions → invoices → DROP SCHEMA/DB → organization |

---

## 7. Authentication & Authorization Flow

### JWT Structure

```json
{
  "id": 42,
  "role": "admin",
  "orgId": 7,
  "iat": 1744480000,
  "exp": 1744566400
}
```

Token expiry is 24 hours. There is no refresh token — expired tokens require re-login.

### Login Flow

```
POST /api/auth/login
Body: { email, password, orgSlug? }

Step 1: If orgSlug provided → find org by slug
        If no orgSlug → query user_org_map for orgs by email

Step 2: If multiple orgs found and no orgSlug → HTTP 300 + [{orgId, orgSlug, orgName}]
        Frontend: show org picker, user selects → re-call login with orgSlug

Step 3: Verify password with bcrypt.compare()

Step 4: Sign JWT { id, role, orgId }

Step 5: Return { token, user, organization }
```

### Multi-Org Login Flow

```
User: "I want to log in as ravi@example.com"
      ↓
Backend: SELECT org_id FROM user_org_map WHERE email = 'ravi@example.com'
         → [org1: "sunrise-hostel", org2: "green-villa"]
      ↓
HTTP 300: { orgs: [{id:1, slug:"sunrise-hostel"}, {id:2, slug:"green-villa"}] }
      ↓
Frontend: Show org selector dropdown
      ↓
User selects "Sunrise Hostel"
      ↓
Frontend: POST /api/auth/login with orgSlug = "sunrise-hostel"
      ↓
Backend: Single org found → verify password → issue JWT with orgId=1
```

### Authorization Layers

```
Request
   │
   ▼ Layer 1: authenticateToken
   │  → Decode JWT, verify signature
   │  → req.user = { id, role, orgId }
   │
   ▼ Layer 2: authorizeRole(['admin'])
   │  → Check req.user.role ∈ allowed roles
   │
   ▼ Layer 3: tenantIsolation
   │  → Verify org is active
   │  → Attach req.pool (org-specific DB connection)
   │
   ▼ Layer 4 (optional): checkPlanLimits('bed')
   │  → Count existing resource vs plan limit
   │  → Reject if exceeded
   │
   ▼ Controller
```

### Super Admin Special Access

Super admins can inspect any org's data by sending the `x-org-id` header:

```
GET /api/super-admin/audit-logs
x-org-id: 5
Authorization: Bearer <super_admin_jwt>
```

`tenantIsolation` detects `req.user.role === 'super_admin'` and uses the header value instead of the JWT's orgId.

---

## 8. Request Lifecycle

### Example: Admin Creates a Tenant

```
1. Admin fills form in PropertyManagement.jsx
2. React calls: api.post('/admin/tenants', formData)
3. Axios interceptor adds: Authorization: Bearer eyJhbG...

4. Express receives POST /api/admin/tenants
5. CORS check: Origin matches whitelist ✓
6. body-parser: Parse JSON body ✓

7. adminRoutes.js: Match route → apply middleware chain:
   a. authenticateToken:
      - Decode JWT → req.user = { id:1, role:'admin', orgId:3 }
   b. authorizeRole(['admin']):
      - req.user.role = 'admin' ✓
   c. tenantIsolation:
      - Query master DB: SELECT * FROM organizations WHERE id = 3
      - org is active ✓
      - DatabaseManager.getOrgPool(3) → return SchemaPool for org_3
      - req.pool = SchemaPool(org_3), req.orgId = 3, req.orgPlan = 'starter'
   d. checkPlanLimits('user'):
      - COUNT users in req.pool → 15
      - plan_limits.starter.max_users = 20
      - 15 < 20 ✓ Proceed

8. adminController.createTenant(req, res):
   - Extract { name, email, bedId, startDate, endDate, rent, phone } from req.body
   - Validate email not duplicate: User.findByEmail(req.pool, email)
   - Validate bed exists and is vacant: Bed.findById(req.pool, bedId)
   - Generate temp password
   - Hash password: bcrypt.hash()
   - BEGIN transaction:
     a. User.create(req.pool, name, email, hashedPwd, 'tenant') → userId
     b. Tenant.create(req.pool, userId, email, bedId, ...) → tenant
     c. Bed.updateStatus(req.pool, bedId, 'occupied')
     d. User.addOrgMapping(email, req.orgId, userId, 'tenant') → master DB
   - COMMIT
   - sendTenantCredentials(email, name, tempPwd, bedInfo, orgName) [async, non-blocking]

9. res.status(201).json({ message: 'Tenant created', tenant, tempPassword })

10. Axios receives 201 → React updates state → UI shows new tenant
```

---

## 9. Payment Architecture

### Rent Payment via Razorpay (Tenant-Initiated)

```
Tenant Dashboard → "Pay Rent" button
        │
        ▼
POST /api/tenant/pay
   → Razorpay.orders.create({ amount: rent*100, currency: 'INR' })
   → Returns { orderId, amount }
        │
        ▼
Frontend: Razorpay checkout popup opens
        │
User pays
        │
        ▼
POST /api/tenant/verify-payment
   Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
        │
        ▼
Backend:
   1. Verify HMAC signature: sha256(orderId + "|" + paymentId, RAZORPAY_KEY_SECRET)
   2. If valid: Payment.create(pool, { tenantId, amount, month, year, razorpayPaymentId })
   3. sendRentReceipt(email, ...) [background]
   4. Return { success, payment }
```

### Subscription Payment via Stripe (Org Registration)

```
Onboarding page → Select paid plan → "Register & Pay"
        │
        ▼
POST /api/stripe/create-checkout-session
   Body: { plan, orgName, orgSlug, orgEmail, adminName, adminEmail, adminPassword }
        │
        ▼
Backend:
   1. Map plan → Stripe price (GBP pence): starter=500, pro=1500, enterprise=5000
   2. stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [{ price_data: { amount }, quantity: 1 }],
        metadata: { orgName, orgSlug, adminEmail, adminPassword, plan, ... },
        success_url: FRONTEND_URL + '/onboarding/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: FRONTEND_URL + '/onboarding'
      })
   3. Return { url: sessionUrl }
        │
        ▼
Frontend redirects to Stripe Checkout page
        │
User pays
        │
        ▼
Stripe redirects to: /onboarding/success?session_id=cs_xxx
        │
        ▼
GET /api/stripe/checkout-success?session_id=cs_xxx
   1. stripe.checkout.sessions.retrieve(sessionId)
   2. Verify payment_status === 'paid'
   3. Idempotency: Check if org with session metadata's slug already exists
   4. Organization.create(name, slug, email, plan)
   5. Subscription.create(orgId, plan, amount)
   6. DatabaseManager.createOrgDatabase(orgId, orgName) → create schema + tables
   7. User.create(orgPool, adminName, adminEmail, adminPassword, 'admin')
   8. User.addOrgMapping(adminEmail, orgId, userId, 'admin')
   9. sendOrgWelcomeEmail(orgEmail, orgName, ...)
   10. Return JWT + org info to frontend
```

---

## 10. Email Delivery Architecture

### Provider Chain

```
Email request (e.g., sendPaymentReminder)
        │
        ▼
emailService.sendEmail(to, subject, html)
        │
        ├── Try: Resend.emails.send({ from, to, subject, html })
        │         │
        │         ├── Success → return true
        │         └── Error  → fall through to SMTP
        │
        └── Try: nodemailer.createTransport(gmailSmtp).sendMail({...})
                  │
                  ├── Success → return true
                  └── Error  → log error, return false
```

**Provider selection:**
- If `RESEND_API_KEY` exists in env → use Resend
- Else if `EMAIL_USER` + `EMAIL_PASSWORD` exist → use Gmail SMTP
- Resend is preferred on Railway (SMTP port 587 may be blocked on some platforms)

### Email Functions Map

```
Trigger                         → Function Called
────────────────────────────────────────────────────────────
Tenant created                  → sendTenantCredentials()
Tenant checked out (auto/manual)→ sendThankYouEmail()
Admin sends reminder            → sendPaymentReminder()
Payment recorded (any method)   → sendRentReceipt()
Org registered / Stripe success → sendOrgWelcomeEmail()
3 days before checkout (cron)   → sendStayExtensionReminder()
Admin deactivates tenant        → sendDeactivationEmail()
```

### Non-Blocking Pattern

All email sends are **fire-and-forget** — they run in the background without blocking the API response:

```javascript
// Non-blocking — response sent immediately, email sent in background
await createTenant(...);                     // DB work done
sendTenantCredentials(email, ...).catch(e => // Email sent after response
  console.error('Email failed:', e)
);
res.status(201).json({ message: 'Tenant created' }); // Returns immediately
```

---

## 11. Scheduled Jobs Architecture

### Cron Schedule Overview

```
UTC Timeline (Daily)
00:05 ─── Checkout Scheduler runs
            │
            ├── getAllOrgPools() → [pool1, pool2, ...]
            ├── For each org:
            │     processTenantCheckouts(pool, orgId)
            │         │
            │         ├── SELECT tenants WHERE end_date = TODAY
            │         ├── For each expired tenant:
            │         │      sendThankYouEmail() [background]
            │         │      UPDATE bed SET status = 'vacant'
            │         │      DELETE payments
            │         │      DELETE tenant
            │         └── Return results summary
            └── Log: "Processed X checkouts across Y orgs"

11:30 ─── Stay Extension Reminder runs
            │
            ├── getAllOrgPools() → [pool1, pool2, ...]
            ├── For each org:
            │     processStayExtensionReminders(pool, orgId, masterPool)
            │         │
            │         ├── SELECT tenants WHERE end_date = TODAY + 3 days
            │         ├── For each tenant:
            │         │      sendStayExtensionReminder() [background]
            │         └── Return reminders count
            └── Log: "Sent X stay extension reminders"
```

IST Timezone Note: 11:30 UTC = 17:00 IST (5 PM, India Standard Time). Reminder emails arrive at end of business day when tenants are likely to check email.

### Scheduler Initialization

Schedulers only start in production (`NODE_ENV === 'production'`). They are invoked in `server.js` after the server starts listening:

```javascript
if (process.env.NODE_ENV === 'production') {
  scheduleCheckoutJob();
  scheduleStayExtensionReminder();
}
```

This prevents schedulers from running during local development or testing.

---

## 12. Data Flow Diagrams

### Org Registration (Free Plan)

```
Browser                  Backend                  PostgreSQL (master)     org_N Schema
───────                  ───────                  ──────────────────     ────────────
POST /api/auth/register-organization
  │                         │
  │──── { orgName, slug,    │
  │       adminEmail,       │
  │       adminPwd, plan } ▶│
  │                         │──── INSERT organizations ──────────────▶ organizations row
  │                         │◀─── orgId = 5
  │                         │
  │                         │──── INSERT subscriptions ─────────────▶ subscriptions row
  │                         │
  │                         │──── createOrgDatabase(5, name) ──────────────────────────▶
  │                         │      CREATE SCHEMA org_5                                  │
  │                         │      CREATE TABLE users, buildings, rooms, beds, ...      │
  │                         │◀─────────────────────────────────────────────────────────
  │                         │
  │                         │──── User.create(org5Pool, admin, ...) ──────────────────▶ users row
  │                         │◀──── userId = 1
  │                         │
  │                         │──── addOrgMapping(email, 5, 1, 'admin') ──────────────▶ user_org_map row
  │                         │
  │                         │──── sendOrgWelcomeEmail() [background]
  │                         │
  │◀── { token, user, org } │
```

### Monthly Payment Info Generation

```
Admin requests /admin/payment-info?month=3&year=2026

Backend adminController.getPaymentInfo():
  1. Fetch all tenants (JOIN users, beds, rooms, buildings)
  2. For each tenant:
     a. Find payment record: Payment.findExisting(pool, tenantId, 3, 2026)
     b. Calculate prorated rent:
        - if start_date is within month → prorate by days
        - else → full rent
     c. Determine bill status:
        - today > 2nd of April 2026 → bill "generated"
        - payment exists → "Paid"
        - bill generated + no payment → "Unpaid"
        - bill not yet generated → "N/A"
  3. Return array with each tenant's status

Frontend PaymentInfo.jsx:
  1. Render table rows with status badges
  2. Export button → exportPaymentData(format, data, ...)
```

---

## 13. Security Architecture

### Defense in Depth

```
Layer 1 — HTTPS (Transport)
  All traffic encrypted via TLS (Railway + Vercel provide this by default)

Layer 2 — CORS
  Origin whitelist in server.js:
    - http://localhost:5173
    - http://localhost:3000
    - https://aupl8.vercel.app
    - https://www.roomipilot.com
    - https://roomipilot.com
  Credentials: true (for future cookie support)

Layer 3 — Authentication (JWT)
  - Token signed with JWT_SECRET (min 32-char random string in production)
  - Token expires in 24 hours — no refresh
  - Verified on every protected request via authenticateToken middleware
  - Passwords hashed with bcryptjs (salt rounds: 10)

Layer 4 — Authorization (RBAC)
  - authorizeRole checks role before any data operation
  - superAdminOnly enforced on platform admin routes
  - Role stored in JWT and verified server-side

Layer 5 — Tenant Isolation
  - tenantIsolation middleware runs before every org-scoped controller
  - Org status verified in real-time (suspended orgs get 403)
  - Each org gets its own DB pool → impossible to accidentally query another org's data

Layer 6 — SQL Injection Prevention
  - ALL SQL queries use parameterized placeholders ($1, $2, ...)
  - No string interpolation of user input into SQL strings
  - PostgreSQL driver handles escaping

Layer 7 — Input Validation
  - Controllers validate required fields before any DB operation
  - Email validated before insert
  - Duplicate checks enforced (email unique, payment unique per month)

Layer 8 — Secrets Management
  - No secrets in codebase
  - All secrets via environment variables only
  - .env files excluded from git (.gitignore)
  - .env.production.example (no real values) tracked for reference
```

### OTP Security

For password reset, a 6-digit OTP is generated and stored **in-memory** (a server-side `Map`) with a 5-minute expiry. OTPs are not stored in the database, preventing leaks if the DB is compromised. The trade-off: OTPs are lost on server restart.

### Plan Limit Enforcement

`checkPlanLimits` middleware prevents resource exhaustion attacks where a tenant could bypass UI limits:

```javascript
// Even if frontend allows it, backend enforces:
if (currentCount >= planLimit && planLimit !== -1) {
  return res.status(403).json({
    message: `Plan limit reached. Upgrade to create more ${resourceType}s.`,
    currentPlan: req.orgPlan,
    limit: planLimit
  });
}
```

---

## 14. Deployment Architecture

### Production Topology

```
Internet
    │
    ├──[HTTPS]──▶ Vercel Edge Network
    │              └── Serves React SPA (static files)
    │                  All routes → /index.html
    │
    └──[HTTPS]──▶ Railway
                   ├── Node.js Service (pg-stay-backend)
                   │     Port: 5000
                   │     Process: node server.js
                   │
                   └── PostgreSQL Add-on
                         Single database: pgstay_prod
                         Schemas: public, org_1, org_2, org_3, ...
```

### Environment Variables Flow

```
Railway Dashboard (secret)
  NODE_ENV=production
  DATABASE_URL=postgresql://pgstay_user:password@host/pgstay_prod
  JWT_SECRET=<random-64-char>
  USE_SINGLE_DB=true
  RESEND_API_KEY=re_xxx
  STRIPE_SECRET_KEY=sk_live_xxx
  FRONTEND_URL=https://roomipilot.com
        │
        ▼
backend/server.js (dotenv.config())
        │
        ▼
All modules read from process.env.*

Vercel Dashboard (secret)
  VITE_API_URL=https://pg-stay-backend.railway.app/api
        │
        ▼
Vite build inlines: import.meta.env.VITE_API_URL
        │
        ▼
Axios baseURL in frontend bundle
```

### Zero-Downtime Considerations

- Railway restarts the server on every deploy. During restart, any in-memory OTPs and org pool cache are lost.
- OTP loss on restart: harmless — user re-requests OTP.
- Pool cache loss on restart: harmless — pools are recreated on first request per org.
- Scheduled jobs restart with the server and run at their next scheduled time.

---

## 15. Key Architectural Decisions & Trade-offs

### Decision 1: Schema-based Multi-Tenancy in Production

**Choice:** Per-org PostgreSQL schemas in production (not separate databases).

**Why:** Railway's free PostgreSQL add-on provides one database. Schema-mode allows isolation without needing multiple databases.

**Trade-off:** Slightly harder to migrate a single org's data; `DROP SCHEMA CASCADE` needed to remove an org. But acceptable given the free-tier constraint.

### Decision 2: Static Class Models (No ORM)

**Choice:** Raw SQL in static class models instead of an ORM (Sequelize, Prisma, TypeORM).

**Why:** Full SQL control, no abstraction overhead, no ORM migrations to manage, predictable query behavior.

**Trade-off:** More boilerplate per model, no automated schema migrations. Any schema change requires manual SQL + script execution.

### Decision 3: In-Memory OTP Store

**Choice:** `Map<email, {otp, expiry}>` in process memory instead of Redis or DB table.

**Why:** Simplicity — no extra infrastructure dependency for a low-frequency feature.

**Trade-off:** OTPs lost on server restart. On Railway, this is acceptable since restarts are infrequent and OTP expiry is only 5 minutes.

### Decision 4: No Client-Side Route Guards

**Choice:** Each page component handles its auth check via `localStorage` read + redirect.

**Why:** Simple to implement with React hooks directly in the component.

**Trade-off:** Code duplication across pages. If auth logic changes, many files need updates. A centralized `ProtectedRoute` component would be a clean improvement.

### Decision 5: No Global API Error Handling

**Choice:** Response interceptor is not set on the Axios instance for global error handling.

**Why:** Each component handles its own errors to allow context-specific messages.

**Trade-off:** 401 (expired token / unauthorized) errors are not centrally caught to redirect to login. Each component must handle this individually.

### Decision 6: Dual Payment Providers

**Choice:** Razorpay for individual rent payments, Stripe for SaaS subscriptions.

**Why:** Razorpay is preferred in India (INR, lower fees, UPI support). Stripe handles international subscription billing better with checkout sessions.

**Trade-off:** Two payment SDKs to maintain, two sets of API keys.

### Decision 7: Non-Blocking Email Sends

**Choice:** Email functions are called without `await` and attached `.catch()` handlers.

**Why:** Email failures should not fail the main operation (tenants created, payments recorded). Users get a success response even if email fails.

**Trade-off:** No guarantee emails are sent. Failures are only logged, not retried. A message queue (BullMQ, etc.) would provide reliability.

---

## 16. Folder & File Structure Reference

```
pg-stay/
│
├── .github/
│   └── copilot-instructions.md      ← AI coding conventions
│
├── backend/
│   ├── server.js                    ← Express app entry point
│   ├── swagger.js                   ← OpenAPI 3.0 config
│   ├── package.json
│   ├── .env.production.example      ← Reference for env vars (no secrets)
│   ├── Dockerfile                   ← Container build (Railway)
│   ├── start.sh, init-and-start.sh  ← Shell start scripts
│   │
│   └── src/
│       ├── config/
│       │   └── database.js          ← getMasterPool() helper
│       │
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── adminRoutes.js
│       │   ├── tenantRoutes.js
│       │   ├── guestRoutes.js
│       │   ├── superAdminRoutes.js
│       │   ├── organizationRoutes.js
│       │   ├── stripeRoutes.js
│       │   └── debugEmailRoutes.js
│       │
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── adminController.js
│       │   ├── tenantController.js
│       │   ├── guestController.js
│       │   ├── superAdminController.js
│       │   ├── organizationController.js
│       │   ├── stripeController.js
│       │   └── debugController.js
│       │
│       ├── models/
│       │   ├── User.js
│       │   ├── Building.js
│       │   ├── Room.js
│       │   ├── Bed.js
│       │   ├── Tenant.js
│       │   ├── Payment.js
│       │   ├── Organization.js
│       │   ├── Subscription.js
│       │   ├── Invoice.js
│       │   └── AuditLog.js
│       │
│       ├── middleware/
│       │   ├── auth.js              ← authenticateToken, authorizeRole
│       │   └── tenantIsolation.js   ← tenantIsolation, checkPlanLimits, superAdminOnly
│       │
│       └── services/
│           ├── DatabaseManager.js   ← Multi-tenancy engine (SchemaPool, pool cache)
│           ├── OrgDatabaseInitializer.js
│           ├── emailService.js
│           ├── checkoutScheduler.js
│           ├── stayExtensionScheduler.js
│           └── tenantCheckoutService.js
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── vercel.json                  ← Vercel SPA routing config
│   ├── .env.production.example
│   │
│   └── src/
│       ├── main.jsx                 ← ReactDOM.createRoot entry
│       ├── App.jsx                  ← BrowserRouter + all route definitions
│       │
│       ├── pages/
│       │   ├── AdminDashboard.jsx
│       │   ├── PropertyManagement.jsx
│       │   ├── PaymentInfo.jsx
│       │   ├── TenantPaymentSearch.jsx
│       │   ├── TenantDashboard.jsx
│       │   ├── SuperAdminDashboard.jsx
│       │   ├── OrgSettings.jsx
│       │   ├── Messenger.jsx
│       │   ├── GuestView.jsx
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Onboarding.jsx
│       │   ├── OnboardingSuccess.jsx
│       │   └── ContactUs.jsx
│       │
│       ├── components/
│       │   ├── Header.jsx
│       │   ├── FloorOccupancyVisual.jsx
│       │   ├── AvailabilityModal.jsx
│       │   ├── ChangePasswordModal.jsx
│       │   ├── TenantCredentialsModal.jsx
│       │   ├── LanguageSwitcher.jsx
│       │   └── Toast.jsx
│       │
│       ├── services/
│       │   ├── api.js               ← Axios instance + JWT interceptor + helpers
│       │   └── exportUtils.js       ← CSV/Excel/PDF export functions
│       │
│       ├── context/
│       │   └── LanguageContext.jsx  ← useLanguage(), useCurrency() hooks
│       │
│       └── locales/
│           ├── en.json
│           ├── hi.json
│           └── te.json
│
├── database/
│   └── schema.sql                   ← SQL schema for per-org tables
│
├── tests/
│   └── utils/                       ← Test utilities (to be populated)
│
├── docs/
│   ├── project.md                   ← This project documentation
│   └── architecture.md              ← This architecture documentation
│
├── render.yaml                      ← Railway/Render deployment config
├── vercel.json                      ← Frontend Vercel config (root level)
└── README.md                        ← Quick start guide
```
