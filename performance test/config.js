// K6 Performance Test Configuration for PG Stay

export const BASE_URL = __ENV.BASE_URL || 'https://pg-stay-backend-production.up.railway.app';

// Test users â€” update these with real credentials from your local DB
export const ADMIN_CREDENTIALS = {
  email: __ENV.ADMIN_EMAIL || 'admin@roomipilot.com',
  password: __ENV.ADMIN_PASSWORD || 'admin123',
};

export const TENANT_CREDENTIALS = {
  email: __ENV.TENANT_EMAIL || 'ravirajh85@gmail.com',
  password: __ENV.TENANT_PASSWORD || 'admin123',
};

export const SUPER_ADMIN_CREDENTIALS = {
  email: __ENV.SUPER_ADMIN_EMAIL || 'superadmin@roomipilot.com',
  password: __ENV.SUPER_ADMIN_PASSWORD || 'superadmin123',
};

// Thresholds â€” define acceptable performance limits
export const THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],   // 95% < 500ms, 99% < 1s
  http_req_failed: ['rate<0.01'],                     // <1% failure rate
  http_reqs: ['rate>10'],                             // At least 10 RPS
};

// Load profiles
export const LOAD_PROFILES = {
  smoke: {
    vus: 1,
    duration: '30s',
  },
  load: {
    stages: [
      { duration: '1m', target: 10 },   // Ramp up to 10 users
      { duration: '3m', target: 10 },   // Stay at 10 users
      { duration: '1m', target: 20 },   // Ramp up to 20 users
      { duration: '3m', target: 20 },   // Stay at 20 users
      { duration: '1m', target: 0 },    // Ramp down
    ],
  },
  stress: {
    stages: [
      { duration: '1m', target: 10 },
      { duration: '2m', target: 30 },
      { duration: '2m', target: 50 },
      { duration: '2m', target: 80 },
      { duration: '2m', target: 100 },
      { duration: '2m', target: 0 },
    ],
  },
  spike: {
    stages: [
      { duration: '30s', target: 5 },
      { duration: '10s', target: 100 }, // Sudden spike
      { duration: '1m', target: 100 },  // Hold spike
      { duration: '30s', target: 5 },   // Recover
      { duration: '1m', target: 5 },    // Stabilize
    ],
  },
  soak: {
    stages: [
      { duration: '2m', target: 20 },
      { duration: '30m', target: 20 },  // Sustained load for 30 min
      { duration: '2m', target: 0 },
    ],
  },
};
