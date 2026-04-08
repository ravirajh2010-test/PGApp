// ============================================================
// PG Stay — K6 Full Performance Test Suite
// ============================================================
// Usage:
//   Smoke:   k6 run --env PROFILE=smoke  "performance test/main-test.js"
//   Load:    k6 run --env PROFILE=load   "performance test/main-test.js"
//   Stress:  k6 run --env PROFILE=stress "performance test/main-test.js"
//   Spike:   k6 run --env PROFILE=spike  "performance test/main-test.js"
//   Soak:    k6 run --env PROFILE=soak   "performance test/main-test.js"
//
// Override credentials:
//   k6 run --env ADMIN_EMAIL=admin@org.com --env ADMIN_PASSWORD=pass123 ...
// ============================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import {
  BASE_URL,
  ADMIN_CREDENTIALS,
  TENANT_CREDENTIALS,
  SUPER_ADMIN_CREDENTIALS,
  THRESHOLDS,
  LOAD_PROFILES,
} from './config.js';
import { login, authHeaders, checkResponse, randomString, randomEmail } from './helpers.js';

// ── Custom Metrics ──────────────────────────────────────────
const loginDuration = new Trend('login_duration', true);
const apiErrors = new Counter('api_errors');
const authSuccessRate = new Rate('auth_success_rate');
const adminApiDuration = new Trend('admin_api_duration', true);
const tenantApiDuration = new Trend('tenant_api_duration', true);
const publicApiDuration = new Trend('public_api_duration', true);

// ── Options ─────────────────────────────────────────────────
const profile = __ENV.PROFILE || 'smoke';
const selectedProfile = LOAD_PROFILES[profile] || LOAD_PROFILES.smoke;

export const options = {
  ...(selectedProfile.stages
    ? { stages: selectedProfile.stages }
    : { vus: selectedProfile.vus, duration: selectedProfile.duration }),
  thresholds: {
    ...THRESHOLDS,
    login_duration: ['p(95)<400'],
    auth_success_rate: ['rate>0.95'],
    admin_api_duration: ['p(95)<600'],
    tenant_api_duration: ['p(95)<500'],
    public_api_duration: ['p(95)<300'],
  },
};

// ── Setup (runs once before all VUs) ────────────────────────
export function setup() {
  // Pre-authenticate and return tokens for VUs to use
  const data = {};

  // Health check
  const healthRes = http.get(`${BASE_URL.replace('/api', '')}/health`);
  check(healthRes, { 'server is healthy': (r) => r.status === 200 });
  if (healthRes.status !== 200) {
    throw new Error('Server health check failed — is the backend running?');
  }

  // Admin login
  try {
    data.adminToken = login(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
  } catch (e) {
    console.warn(`⚠ Admin login failed: ${e.message}. Admin tests will be skipped.`);
    data.adminToken = null;
  }

  // Tenant login
  try {
    data.tenantToken = login(TENANT_CREDENTIALS.email, TENANT_CREDENTIALS.password);
  } catch (e) {
    console.warn(`⚠ Tenant login failed: ${e.message}. Tenant tests will be skipped.`);
    data.tenantToken = null;
  }

  // Super admin login
  try {
    data.superAdminToken = login(SUPER_ADMIN_CREDENTIALS.email, SUPER_ADMIN_CREDENTIALS.password);
  } catch (e) {
    console.warn(`⚠ Super admin login failed: ${e.message}. Super admin tests will be skipped.`);
    data.superAdminToken = null;
  }

  return data;
}

// ── Main VU Function ────────────────────────────────────────
export default function (data) {
  // Each VU runs through all test groups in sequence
  testHealthCheck();
  testAuthFlow();

  if (data.adminToken) {
    testAdminTenantManagement(data.adminToken);
    testAdminPropertyManagement(data.adminToken);
    testAdminPaymentInfo(data.adminToken);
    testAdminOccupancy(data.adminToken);
  }

  if (data.tenantToken) {
    testTenantDashboard(data.tenantToken);
  }

  testPublicGuestEndpoints();

  if (data.adminToken) {
    testAdminOrganization(data.adminToken);
  }

  if (data.superAdminToken) {
    testSuperAdminEndpoints(data.superAdminToken);
  }

  sleep(1); // Think time between iterations
}

// ── Test: Health Check ──────────────────────────────────────
function testHealthCheck() {
  group('Health Check', () => {
    const res = http.get(`${BASE_URL.replace('/api', '')}/health`, {
      tags: { name: 'health_check' },
    });
    checkResponse(res, 'health_check');
    publicApiDuration.add(res.timings.duration);
  });
}

// ── Test: Authentication Flow ───────────────────────────────
function testAuthFlow() {
  group('Auth - Login', () => {
    // Successful admin login
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({
        email: ADMIN_CREDENTIALS.email,
        password: ADMIN_CREDENTIALS.password,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'auth_login' },
      }
    );
    loginDuration.add(Date.now() - start);

    const success = check(res, {
      'login returns 200': (r) => r.status === 200,
      'login has token': (r) => {
        try { return JSON.parse(r.body).token !== undefined; } catch { return false; }
      },
    });
    authSuccessRate.add(success ? 1 : 0);
    if (!success) apiErrors.add(1);
  });

  group('Auth - Invalid Login', () => {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: 'invalid@test.com', password: 'wrong' }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'auth_login_invalid' },
      }
    );
    check(res, {
      'invalid login returns 401 or 400': (r) => r.status === 401 || r.status === 400,
    });
  });

  sleep(0.5);
}

// ── Test: Admin — Tenant Management ─────────────────────────
function testAdminTenantManagement(token) {
  const headers = authHeaders(token);

  group('Admin - Get Tenants', () => {
    const res = http.get(`${BASE_URL}/admin/tenants`, {
      ...headers,
      tags: { name: 'admin_get_tenants' },
    });
    checkResponse(res, 'get_tenants');
    adminApiDuration.add(res.timings.duration);
    if (res.status !== 200) apiErrors.add(1);
  });

  group('Admin - Search Tenants', () => {
    const res = http.get(`${BASE_URL}/admin/search-tenants?q=test`, {
      ...headers,
      tags: { name: 'admin_search_tenants' },
    });
    checkResponse(res, 'search_tenants');
    adminApiDuration.add(res.timings.duration);
  });

  sleep(0.3);
}

// ── Test: Admin — Property Management ───────────────────────
function testAdminPropertyManagement(token) {
  const headers = authHeaders(token);

  group('Admin - Get Buildings', () => {
    const res = http.get(`${BASE_URL}/admin/buildings`, {
      ...headers,
      tags: { name: 'admin_get_buildings' },
    });
    checkResponse(res, 'get_buildings');
    adminApiDuration.add(res.timings.duration);
  });

  group('Admin - Get Rooms', () => {
    const res = http.get(`${BASE_URL}/admin/rooms`, {
      ...headers,
      tags: { name: 'admin_get_rooms' },
    });
    checkResponse(res, 'get_rooms');
    adminApiDuration.add(res.timings.duration);
  });

  group('Admin - Get Beds', () => {
    const res = http.get(`${BASE_URL}/admin/beds`, {
      ...headers,
      tags: { name: 'admin_get_beds' },
    });
    checkResponse(res, 'get_beds');
    adminApiDuration.add(res.timings.duration);
  });

  sleep(0.3);
}

// ── Test: Admin — Payment Info ──────────────────────────────
function testAdminPaymentInfo(token) {
  const headers = authHeaders(token);
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  group('Admin - Payment Info (Current Month)', () => {
    const res = http.get(
      `${BASE_URL}/admin/payment-info?month=${month}&year=${year}`,
      { ...headers, tags: { name: 'admin_payment_info_current' } }
    );
    checkResponse(res, 'payment_info_current');
    adminApiDuration.add(res.timings.duration);
  });

  group('Admin - Payment Info (Previous Month)', () => {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const res = http.get(
      `${BASE_URL}/admin/payment-info?month=${prevMonth}&year=${prevYear}`,
      { ...headers, tags: { name: 'admin_payment_info_prev' } }
    );
    checkResponse(res, 'payment_info_prev');
    adminApiDuration.add(res.timings.duration);
  });

  sleep(0.3);
}

// ── Test: Admin — Occupancy & Layout ────────────────────────
function testAdminOccupancy(token) {
  const headers = authHeaders(token);

  group('Admin - Occupancy', () => {
    const res = http.get(`${BASE_URL}/admin/occupancy`, {
      ...headers,
      tags: { name: 'admin_occupancy' },
    });
    checkResponse(res, 'occupancy');
    adminApiDuration.add(res.timings.duration);
  });

  group('Admin - Available Beds', () => {
    const res = http.get(`${BASE_URL}/admin/available-beds`, {
      ...headers,
      tags: { name: 'admin_available_beds' },
    });
    checkResponse(res, 'available_beds');
    adminApiDuration.add(res.timings.duration);
  });

  group('Admin - Floor Layout', () => {
    const res = http.get(`${BASE_URL}/admin/floor-layout`, {
      ...headers,
      tags: { name: 'admin_floor_layout' },
    });
    checkResponse(res, 'floor_layout');
    adminApiDuration.add(res.timings.duration);
  });

  group('Admin - Floor Layout with Beds', () => {
    const res = http.get(`${BASE_URL}/admin/floor-layout-beds`, {
      ...headers,
      tags: { name: 'admin_floor_layout_beds' },
    });
    checkResponse(res, 'floor_layout_beds');
    adminApiDuration.add(res.timings.duration);
  });

  sleep(0.3);
}

// ── Test: Admin — Organization ──────────────────────────────
function testAdminOrganization(token) {
  const headers = authHeaders(token);

  group('Admin - Get Organization', () => {
    const res = http.get(`${BASE_URL}/organization/me`, {
      ...headers,
      tags: { name: 'admin_get_org' },
    });
    checkResponse(res, 'get_org');
    adminApiDuration.add(res.timings.duration);
  });

  group('Admin - Get Subscription', () => {
    const res = http.get(`${BASE_URL}/organization/subscription`, {
      ...headers,
      tags: { name: 'admin_get_subscription' },
    });
    // May return 404 if no subscription — that's OK
    check(res, {
      'subscription returns 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
    adminApiDuration.add(res.timings.duration);
  });

  group('Admin - Get Org Users', () => {
    const res = http.get(`${BASE_URL}/organization/users`, {
      ...headers,
      tags: { name: 'admin_get_org_users' },
    });
    checkResponse(res, 'get_org_users');
    adminApiDuration.add(res.timings.duration);
  });

  group('Admin - Get Audit Logs', () => {
    const res = http.get(`${BASE_URL}/organization/audit-logs`, {
      ...headers,
      tags: { name: 'admin_get_audit_logs' },
    });
    check(res, {
      'audit logs returns 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
    adminApiDuration.add(res.timings.duration);
  });

  sleep(0.3);
}

// ── Test: Tenant Dashboard ──────────────────────────────────
function testTenantDashboard(token) {
  const headers = authHeaders(token);

  group('Tenant - Get Profile', () => {
    const res = http.get(`${BASE_URL}/tenant/profile`, {
      ...headers,
      tags: { name: 'tenant_profile' },
    });
    checkResponse(res, 'tenant_profile');
    tenantApiDuration.add(res.timings.duration);
  });

  group('Tenant - Stay Details', () => {
    const res = http.get(`${BASE_URL}/tenant/stay-details`, {
      ...headers,
      tags: { name: 'tenant_stay_details' },
    });
    checkResponse(res, 'tenant_stay_details');
    tenantApiDuration.add(res.timings.duration);
  });

  group('Tenant - Payment History', () => {
    const res = http.get(`${BASE_URL}/tenant/payments`, {
      ...headers,
      tags: { name: 'tenant_payments' },
    });
    checkResponse(res, 'tenant_payments');
    tenantApiDuration.add(res.timings.duration);
  });

  group('Tenant - Admin Contact', () => {
    const res = http.get(`${BASE_URL}/tenant/admin-contact`, {
      ...headers,
      tags: { name: 'tenant_admin_contact' },
    });
    checkResponse(res, 'tenant_admin_contact');
    tenantApiDuration.add(res.timings.duration);
  });

  sleep(0.3);
}

// ── Test: Public Guest Endpoints ────────────────────────────
function testPublicGuestEndpoints() {
  // Guest endpoints require an org slug — use a placeholder
  // Override with: --env ORG_SLUG=your-org-slug
  const orgSlug = __ENV.ORG_SLUG || 'test-org';

  group('Guest - Get Buildings', () => {
    const res = http.get(`${BASE_URL}/guest/${orgSlug}/buildings`, {
      tags: { name: 'guest_buildings' },
    });
    // May return 404 if org slug doesn't exist — that's expected in test
    check(res, {
      'guest buildings returns 200 or 404': (r) => r.status === 200 || r.status === 404,
      'guest buildings response time < 300ms': (r) => r.timings.duration < 300,
    });
    publicApiDuration.add(res.timings.duration);
  });

  group('Guest - Get Occupancy', () => {
    const res = http.get(`${BASE_URL}/guest/${orgSlug}/occupancy`, {
      tags: { name: 'guest_occupancy' },
    });
    check(res, {
      'guest occupancy returns 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
    publicApiDuration.add(res.timings.duration);
  });

  sleep(0.3);
}

// ── Test: Super Admin Endpoints ─────────────────────────────
function testSuperAdminEndpoints(token) {
  const headers = authHeaders(token);

  group('SuperAdmin - Platform Stats', () => {
    const res = http.get(`${BASE_URL}/super-admin/stats`, {
      ...headers,
      tags: { name: 'superadmin_stats' },
    });
    checkResponse(res, 'superadmin_stats');
    adminApiDuration.add(res.timings.duration);
  });

  group('SuperAdmin - Get Organizations', () => {
    const res = http.get(`${BASE_URL}/super-admin/organizations`, {
      ...headers,
      tags: { name: 'superadmin_orgs' },
    });
    checkResponse(res, 'superadmin_orgs');
    adminApiDuration.add(res.timings.duration);
  });

  group('SuperAdmin - Get Plans', () => {
    const res = http.get(`${BASE_URL}/super-admin/plans`, {
      ...headers,
      tags: { name: 'superadmin_plans' },
    });
    checkResponse(res, 'superadmin_plans');
    adminApiDuration.add(res.timings.duration);
  });

  group('SuperAdmin - Get Subscriptions', () => {
    const res = http.get(`${BASE_URL}/super-admin/subscriptions`, {
      ...headers,
      tags: { name: 'superadmin_subscriptions' },
    });
    check(res, {
      'subscriptions returns 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
    adminApiDuration.add(res.timings.duration);
  });

  group('SuperAdmin - Audit Logs', () => {
    const res = http.get(`${BASE_URL}/super-admin/audit-logs`, {
      ...headers,
      tags: { name: 'superadmin_audit_logs' },
    });
    check(res, {
      'audit logs returns 200 or 404': (r) => r.status === 200 || r.status === 404,
    });
    adminApiDuration.add(res.timings.duration);
  });

  sleep(0.3);
}

// ── Teardown ────────────────────────────────────────────────
export function teardown(data) {
  console.log('✅ Performance test complete.');
  console.log(`   Profile: ${profile}`);
}
