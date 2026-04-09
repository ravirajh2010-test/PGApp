// Shared helper functions for K6 tests

import http from 'k6/http';
import { check, fail } from 'k6';
import { BASE_URL } from './config.js';

/**
 * Login and return the JWT token
 * Handles multi-org scenarios by selecting the first org
 */
export function login(email, password) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } }
  );

  // Handle multi-org case (status 300)
  if (res.status === 300) {
    try {
      const body = JSON.parse(res.body);
      if (body.organizations && Array.isArray(body.organizations) && body.organizations.length > 0) {
        const selectedOrg = body.organizations[0];
        console.log(`ℹ️ User has multiple orgs, selecting: ${selectedOrg.name} (id: ${selectedOrg.id})`);
        return loginWithOrg(email, password, selectedOrg.id);
      } else {
        fail(`Multi-org login failed for ${email}: no organizations found in response`);
      }
    } catch (err) {
      fail(`Multi-org login failed for ${email}: could not parse response - ${err.message}`);
    }
  }

  const ok = check(res, {
    'login status is 200': (r) => r.status === 200,
    'login returns token': (r) => {
      try {
        return JSON.parse(r.body).token !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!ok) {
    fail(`Login failed for ${email}: ${res.status} - ${res.body}`);
  }

  return JSON.parse(res.body).token;
}

/**
 * Login with organization context
 */
export function loginWithOrg(email, password, orgId) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password, orgId }),
    { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login-with-org' } }
  );

  const ok = check(res, {
    'org login status is 200': (r) => r.status === 200,
    'org login returns token': (r) => {
      try {
        return JSON.parse(r.body).token !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!ok) {
    fail(`Login with org failed for ${email} in org ${orgId}: ${res.status} - ${res.body}`);
  }

  try {
    return JSON.parse(res.body).token;
  } catch {
    fail(`Could not extract token from org login response`);
  }
}

/**
 * Build auth headers from a token
 */
export function authHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}

/**
 * Standard response checks
 */
export function checkResponse(res, name, expectedStatus = 200) {
  check(res, {
    [`${name} status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${name} response time < 500ms`]: (r) => r.timings.duration < 500,
  });
}

/**
 * Generate a random string for unique test data
 */
export function randomString(len = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a random email
 */
export function randomEmail() {
  return `perftest_${randomString(6)}@test.com`;
}
