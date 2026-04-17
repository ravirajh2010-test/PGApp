# PG Stay - Copilot Instructions

> **IMPORTANT**: Never access `.env` files. Use `.env.production.example` for environment variable reference.

---

## Project Overview

PG Stay is a **multi-tenant SaaS platform** for hostel/PG (Paying Guest) management. It allows property owners to manage buildings, rooms, beds, tenants, and payments through a role-based web application with super admin, admin, and tenant roles.

---

## Tech Stack

| Layer       | Technology                                                         |
| ----------- | ------------------------------------------------------------------ |
| **Backend** | Node.js, Express.js 5.x, PostgreSQL (pg), JWT, bcryptjs, Nodemailer, Resend, Razorpay, Stripe, node-cron, Swagger |
| **Frontend**| React 18, Vite, Tailwind CSS, React Router v6, Axios, react-intl (i18n), jspdf, xlsx |
| **Database**| PostgreSQL with multi-tenant schema isolation                      |
| **Deploy**  | Backend on Railway, Frontend on Vercel                             |

---

## Architecture

### Multi-Tenant Isolation
- **Local Development (Multi-DB mode)**: Each organization gets its own PostgreSQL database.
- **Production (Single-DB/Schema mode)**: Each organization gets a PostgreSQL schema within a shared database, managed by `DatabaseManager` with `SchemaPool` wrapper. Controlled by `USE_SINGLE_DB=true`. Deployed on Railway.

### Database Structure
- **Master DB (shared)**: `organizations`, `subscriptions`, `invoices`, `user_org_map`, `super_admin` users.
- **Per-Org DB/Schema**: `users`, `buildings`, `rooms`, `beds`, `tenants`, `payments`, `audit_logs`, `invoices`, and other tenant-specific tables.

### Backend Layers
```
Routes → Middleware (auth, tenantIsolation) → Controllers → Models → PostgreSQL
```

| Layer         | Path                        | Responsibility                              |
| ------------- | --------------------------- | ------------------------------------------- |
| Routes        | `backend/src/routes/`       | HTTP endpoint definitions                   |
| Controllers   | `backend/src/controllers/`  | Request handling, business logic             |
| Models        | `backend/src/models/`       | Static class-based DB queries (parameterized) |
| Middleware    | `backend/src/middleware/`    | JWT auth (`authenticateToken`), role auth (`authorizeRole`), tenant isolation |
| Services      | `backend/src/services/`     | Email, checkout scheduler, stay extension   |
| Config        | `backend/src/config/`       | Database connection pool management          |

### API Routes
```
/api/auth/          → Authentication (register, login, OTP, password)
/api/admin/         → Admin operations (CRUD on buildings, rooms, beds, tenants)
/api/tenant/        → Tenant-specific operations
/api/guest/         → Public guest views
/api/super-admin/   → Super admin controls
/api/organization/  → Organization management
/api/stripe/        → Stripe payment integration
/api-docs/          → Swagger API documentation
/health             → Health check
```

### Frontend Structure
```
frontend/src/
├── pages/          → Full-page components (PascalCase .jsx)
├── components/     → Reusable UI components (PascalCase .jsx)
├── services/       → API client (Axios with JWT interceptor)
├── context/        → React Context for state management (LanguageContext, etc.)
├── locales/        → i18n translation files
├── App.jsx         → Router setup
└── main.jsx        → Entry point
```

### Key Services
| Service                     | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `DatabaseManager.js`        | Per-org database/schema pool management       |
| `OrgDatabaseInitializer.js` | Initialize org-specific database tables       |
| `emailService.js`           | Unified email dispatch (Resend + SMTP fallback) |
| `checkoutScheduler.js`      | Cron job for tenant checkout                  |
| `stayExtensionScheduler.js` | Cron job for stay extension reminders         |
| `tenantCheckoutService.js`  | Tenant checkout business logic                |

---

## Naming Conventions

### File Naming
| Type              | Convention     | Examples                                    |
| ----------------- | -------------- | ------------------------------------------- |
| Route files       | camelCase.js   | `authRoutes.js`, `adminRoutes.js`           |
| Controller files  | camelCase.js   | `authController.js`, `stripeController.js`  |
| Model files       | PascalCase.js  | `User.js`, `Building.js`, `Tenant.js`       |
| Service files     | camelCase.js   | `emailService.js`, `tenantCheckoutService.js` |
| Middleware files  | camelCase.js   | `auth.js`, `tenantIsolation.js`             |
| React pages       | PascalCase.jsx | `AdminDashboard.jsx`, `Login.jsx`           |
| React components  | PascalCase.jsx | `PropertyManagement.jsx`                    |
| Context files     | PascalCase.jsx | `LanguageContext.jsx`                        |
| Utility files     | camelCase.js   | `api.js`, `exportUtils.js`                  |

### Code Naming
| Context                  | Convention      | Examples                                |
| ------------------------ | --------------- | --------------------------------------- |
| Functions & variables    | camelCase       | `fetchTenants()`, `orgSlug`, `userId`   |
| React components         | PascalCase      | `AdminDashboard`, `PaymentInfo`         |
| React hooks              | camelCase (use*) | `useCurrency()`, `useState()`          |
| Constants / Env vars     | UPPER_SNAKE_CASE | `DATABASE_URL`, `JWT_SECRET`           |
| Database columns         | snake_case      | `user_id`, `bed_id`, `start_date`       |
| Database tables          | snake_case      | `audit_logs`, `user_org_map`            |
| CSS classes              | Tailwind (kebab)| `flex items-center bg-brand-500`        |
| API endpoints            | kebab-case      | `/api/auth/change-password`             |

---

## Coding Conventions

### Backend
- **Models** are static classes. Every query method takes `pool` as the first argument (for tenant isolation). No org_id filtering needed since each org has its own schema/database.
- **SQL queries** must use parameterized placeholders (`$1`, `$2`, ...) to prevent SQL injection. Never interpolate user input into queries.
- **Controllers** use `async/await` with try-catch. Return JSON responses with `{ message }` for errors and appropriate HTTP status codes (4xx for client errors, 5xx for server errors).
- **Authentication** is JWT-based. Protected routes use `authenticateToken` middleware. Role-restricted routes add `authorizeRole('admin')` or similar.
- **CORS** whitelist is managed in `server.js`.
- **Environment variables** are loaded via `dotenv`. Reference `.env.production.example` for variable names.

### Frontend
- **Functional components only** with React hooks (`useState`, `useEffect`, `useNavigate`).
- **State management** via React Context API (no Redux).
- **API calls** go through the shared Axios instance in `services/api.js`, which auto-attaches JWT tokens from `localStorage`.
- **Internationalization** uses `react-intl` with `<FormattedMessage>` components.
- **Styling** is Tailwind CSS utility classes. No custom CSS unless absolutely necessary.
- **Form handling** uses controlled components with `useState` for `formData`.
- **Loading states** must be handled: show loading indicator during fetch, error message on failure.

### General
- Use `async/await` over raw Promises.
- Prefer `const` over `let`. Never use `var`.
- Use destructuring for function parameters and imports.
- Keep functions focused and single-purpose.

---

## Environment Variables Reference

### Backend (`backend/.env.production.example`)
```
NODE_ENV, PORT, DATABASE_URL, JWT_SECRET,
EMAIL_USER, EMAIL_PASSWORD,
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY,
FRONTEND_URL, USE_SINGLE_DB
```

### Frontend (`frontend/.env.production.example`)
```
VITE_API_URL=https://your-backend-url.onrender.com/api
```

---

## Development Workflow & Quality Gates

### 1. Feature Development
- Every new feature **must** have a corresponding branch. Do not commit directly to `main`.
- Follow the existing architecture: Route → Controller → Model pattern for backend; Page/Component pattern for frontend.
- All database queries must use parameterized placeholders. No raw string interpolation.

### 2. Test Cases (Mandatory)
- **Every feature must include test cases** before it is considered complete.
- Write **unit tests** for models and utility functions.
- Write **integration tests** for API endpoints (test full request-response cycle).
- Write **component tests** for React pages/components with meaningful user interactions.
- Test edge cases: invalid input, unauthorized access, missing data, duplicate entries.
- Test multi-tenant isolation: ensure one org's data cannot be accessed by another.

### 3. Code Review (Mandatory)
- **All code must go through a pull request and code review** before merging.
- Reviewer must verify:
  - Adherence to naming and coding conventions listed above.
  - Proper error handling and input validation.
  - No hardcoded secrets or credentials.
  - SQL injection prevention (parameterized queries).
  - Tenant isolation is maintained (no cross-org data leaks).
  - Tests are written and passing.
  - No unnecessary dependencies added.

### 4. Security Scanning (Mandatory)
- **Code must be scanned for security vulnerabilities** before deployment.
- Check for OWASP Top 10 vulnerabilities:
  - **Injection**: All SQL queries use parameterized placeholders (`$1`, `$2`).
  - **Broken Authentication**: JWT tokens validated on every protected route. Passwords hashed with bcrypt.
  - **Sensitive Data Exposure**: No secrets in code or logs. Use environment variables only.
  - **Broken Access Control**: Role-based middleware (`authorizeRole`) on every restricted endpoint. Tenant isolation enforced.
  - **Security Misconfiguration**: CORS whitelist maintained. Production error messages do not leak internal details.
  - **XSS**: Sanitize user input before rendering. React's JSX auto-escapes by default.
  - **CSRF**: API uses token-based auth (not cookies), reducing CSRF risk.
- Run `npm audit` to check for known dependency vulnerabilities.
- No `eval()`, `Function()`, or dynamic code execution from user input.
- Never commit `.env` files. Only `.env.production.example` templates are tracked.

### 5. Deployment Checklist
- All tests pass.
- Code review approved.
- Security scan clean.
- Environment variables set in Railway/Vercel dashboards (never in code).
- Database migrations applied if schema changed.
