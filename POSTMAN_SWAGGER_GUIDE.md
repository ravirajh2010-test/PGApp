# PG Stay API - Swagger & Postman Documentation

## Quick Start

### Option 1: View Swagger UI (Recommended)

After starting the backend server, access the interactive API documentation:

```
http://localhost:5000/api-docs
```

Features:
- Interactive endpoint explorer
- Try-it-out functionality
- Request/response examples
- Authorization header support
- Export as OpenAPI spec

### Option 2: Import Postman Collection

1. **Open Postman** â†’ Click "Import"
2. **Upload** `POSTMAN_COLLECTION.json` from project root
3. Set environment variable:
   - `baseUrl`: `http://localhost:5000/api`
   - `token`: (Get from login response)

## API Base URL

```
http://localhost:5000/api
```

## Authentication

Most endpoints require a **JWT Bearer Token**. 

### Steps to Get Token:

1. **POST** `/auth/login`
   ```json
   {
     "email": "admin@test.com",
     "password": "admin123"
   }
   ```

2. **Copy the token** from response
3. **Add to Headers** in all authenticated requests:
   ```
   Authorization: Bearer <token_here>
   ```

In Postman, use the `{{token}}` variable which is set globally.

## API Endpoints Summary

### Public Endpoints (No Auth Required)
- `POST /auth/register` - Register new user
- `POST /auth/login` - Get JWT token
- `POST /auth/register-organization` - Register organization
- `GET /guest/{orgSlug}/buildings` - View buildings (guest)
- `GET /guest/{orgSlug}/rooms/{buildingId}` - View rooms (guest)
- `GET /guest/{orgSlug}/vacancies/{roomId}` - View vacancies (guest)
- `GET /health` - Server health check

### Admin Endpoints (Requires Admin Role + Token)
- **Tenants:** GET, POST, PUT, DELETE, Search, Payment History
- **Buildings:** GET, POST, PUT, DELETE
- **Rooms:** GET, POST, PUT, DELETE
- **Beds:** GET, POST, PUT, DELETE
- **Payments:** Get Info, Send Reminder, Mark Offline
- **Analytics:** Occupancy, Available Beds, Floor Layout

### Tenant Endpoints (Requires Tenant Role + Token)
- `GET /tenant/profile` - Profile info
- `GET /tenant/stay-details` - Stay information
- `GET /tenant/payments` - Payment history
- `POST /tenant/pay` - Create payment order
- `POST /tenant/verify-payment` - Verify Razorpay payment
- `GET /tenant/admin-contact` - Contact info

### Organization Endpoints (Requires Admin Role + Token)
- `GET /organization/me` - Organization details
- `PUT /organization/me` - Update organization
- `GET /organization/subscription` - Subscription status
- `GET /organization/invoices` - Invoices
- `GET /organization/audit-logs` - Activity logs
- `GET /organization/users` - Users list

### Super Admin Endpoints (Requires Super Admin Role + Token)
- **Platform:** Get stats, audit logs
- **Organizations:** List, Get, Update, Suspend, Activate, Update Plan
- **Billing:** Subscriptions, Invoices, Plan Limits

## Default Credentials

### Super Admin
- Email: `superadmin@roomipilot.com`
- Password: `superadmin123`

### Test Admin
- Email: `admin@test.com`
- Password: `admin123`

### Test Tenant
- Email: `tenant@test.com`
- Password: `tenant123`

## Environment Variables for Postman

| Variable | Value | Type |
|----------|-------|------|
| `baseUrl` | `http://localhost:5000/api` | string |
| `token` | Leave empty (fill after login) | string |

You can also set these in your `.env` file:
```
API_URL=http://localhost:5000/api
```

## Testing Workflow

### 1. Health Check (No Auth)
```
GET http://localhost:5000/health
```
Should return: `{ "status": "ok", "database": "connected" }`

### 2. Get Token (No Auth)
```
POST /auth/login
Body: { "email": "admin@test.com", "password": "admin123" }
```
Copy the token from response → Update `{{token}}` variable

### 3. Test Admin Endpoints (With Auth)
```
GET /admin/tenants
Header: Authorization: Bearer {{token}}
```

### 4. Create Resources
Start with buildings â†’ rooms â†’ beds â†’ tenants

## Common Issues & Solutions

### 401 Unauthorized
- ❌ Problem: Missing or invalid token
- ✅ Solution: Login again and copy fresh token

### 403 Forbidden
- ❌ Problem: User role doesn't have access
- ✅ Solution: Use correct credentials for role (admin, tenant, super_admin)

### 404 Not Found
- ❌ Problem: Resource ID is invalid
- ✅ Solution: Get valid ID from LIST endpoint first

### 422 Unprocessable Entity
- ❌ Problem: Invalid request body or constraint violation
- ✅ Solution: Check request format and required fields

## Swagger/OpenAPI Files Location

- **Swagger UI**: `http://localhost:5000/api-docs`
- **OpenAPI JSON**: `http://localhost:5000/api-docs.json`
- **Swagger Config**: `backend/swagger.js`

## Export API Docs

To export OpenAPI spec for documentation:
```
GET http://localhost:5000/api-docs.json
```

Then import into:
- Postman (to update collection)
- ReDoc (for HTML documentation)
- Swagger UI (standalone)
- API documentation tools

## Installation & Setup

### Install Dependencies
```bash
cd backend
npm install
```

### Run Server
```bash
npm run dev
```
Server will start on `http://localhost:5000`

## Troubleshooting

### Server won't start
1. Check if port 5000 is in use: `lsof -i :5000`
2. Check `.env` file exists and is configured
3. Verify database connection

### Can't connect to database
1. Ensure PostgreSQL is running
2. Check database credentials in `.env`
3. Verify database exists or auto-create is enabled

### Swagger page is blank
1. Clear browser cache
2. Restart backend server
3. Check browser console for errors

## Additional Resources

- [Express API Documentation](https://expressjs.com/)
- [Swagger/OpenAPI Specification](https://swagger.io/)
- [Postman Documentation](https://learning.postman.com/)
- [JWT Authentication Guide](https://jwt.io/)

---

**Questions or Issues?** Check the backend logs or server console for detailed error messages.
