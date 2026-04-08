// ============================================================
// PG Stay — K6 CRUD Write Operations Test
// ============================================================
// Tests create/update/delete operations under load.
// WARNING: This creates and deletes real data in your DB.
// Run against a test/staging database only!
//
// Usage:
//   k6 run "performance test/crud-test.js"
//   k6 run --env PROFILE=load "performance test/crud-test.js"
// ============================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL, ADMIN_CREDENTIALS, LOAD_PROFILES } from './config.js';
import { login, authHeaders, checkResponse, randomString } from './helpers.js';

const crudDuration = new Trend('crud_operation_duration', true);
const crudErrors = new Counter('crud_errors');

const profile = __ENV.PROFILE || 'smoke';
const selectedProfile = LOAD_PROFILES[profile] || LOAD_PROFILES.smoke;

export const options = {
  ...(selectedProfile.stages
    ? { stages: selectedProfile.stages }
    : { vus: selectedProfile.vus, duration: selectedProfile.duration }),
  thresholds: {
    crud_operation_duration: ['p(95)<1000'],
    crud_errors: ['count<5'],
  },
};

export function setup() {
  const healthRes = http.get(`${BASE_URL.replace('/api', '')}/health`);
  if (healthRes.status !== 200) {
    throw new Error('Server health check failed');
  }

  let adminToken;
  try {
    adminToken = login(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.password);
  } catch (e) {
    throw new Error(`Admin login failed: ${e.message}`);
  }

  // Fetch existing buildings to use for room creation
  const buildingsRes = http.get(`${BASE_URL}/admin/buildings`, authHeaders(adminToken));
  let buildings = [];
  try {
    buildings = JSON.parse(buildingsRes.body);
  } catch { /* empty */ }

  return { adminToken, buildings };
}

export default function (data) {
  const { adminToken, buildings } = data;
  const headers = authHeaders(adminToken);

  // ── Building CRUD ─────────────────────────────────────────
  group('CRUD - Building Lifecycle', () => {
    const buildingName = `PerfTest-Bldg-${randomString(4)}`;

    // Create
    const createRes = http.post(
      `${BASE_URL}/admin/buildings`,
      JSON.stringify({ name: buildingName, location: 'Test Location', floors: 2 }),
      { ...headers, tags: { name: 'crud_create_building' } }
    );
    crudDuration.add(createRes.timings.duration);

    const created = check(createRes, {
      'building created (201)': (r) => r.status === 201 || r.status === 200,
    });
    if (!created) {
      crudErrors.add(1);
      return;
    }

    let buildingId;
    try {
      const body = JSON.parse(createRes.body);
      buildingId = body.id || body.building?.id;
    } catch {
      crudErrors.add(1);
      return;
    }

    // Update
    if (buildingId) {
      const updateRes = http.put(
        `${BASE_URL}/admin/buildings/${buildingId}`,
        JSON.stringify({ name: `${buildingName}-Updated`, location: 'Updated Location' }),
        { ...headers, tags: { name: 'crud_update_building' } }
      );
      crudDuration.add(updateRes.timings.duration);
      check(updateRes, { 'building updated (200)': (r) => r.status === 200 });

      sleep(0.2);

      // Delete
      const deleteRes = http.del(
        `${BASE_URL}/admin/buildings/${buildingId}`,
        null,
        { ...headers, tags: { name: 'crud_delete_building' } }
      );
      crudDuration.add(deleteRes.timings.duration);
      check(deleteRes, {
        'building deleted (200)': (r) => r.status === 200 || r.status === 204,
      });
    }
  });

  sleep(0.5);

  // ── Room CRUD (requires existing building) ────────────────
  if (buildings && buildings.length > 0) {
    group('CRUD - Room Lifecycle', () => {
      const buildingId = buildings[0].id;
      const roomNumber = `PT-${randomString(3)}`;

      // Create
      const createRes = http.post(
        `${BASE_URL}/admin/rooms`,
        JSON.stringify({ building_id: buildingId, room_number: roomNumber, floor: 1, capacity: 3 }),
        { ...headers, tags: { name: 'crud_create_room' } }
      );
      crudDuration.add(createRes.timings.duration);

      const created = check(createRes, {
        'room created': (r) => r.status === 201 || r.status === 200,
      });

      if (created) {
        let roomId;
        try {
          const body = JSON.parse(createRes.body);
          roomId = body.id || body.room?.id;
        } catch { /* empty */ }

        if (roomId) {
          // Update
          const updateRes = http.put(
            `${BASE_URL}/admin/rooms/${roomId}`,
            JSON.stringify({ capacity: 4 }),
            { ...headers, tags: { name: 'crud_update_room' } }
          );
          crudDuration.add(updateRes.timings.duration);
          check(updateRes, { 'room updated': (r) => r.status === 200 });

          sleep(0.2);

          // Delete
          const deleteRes = http.del(
            `${BASE_URL}/admin/rooms/${roomId}`,
            null,
            { ...headers, tags: { name: 'crud_delete_room' } }
          );
          crudDuration.add(deleteRes.timings.duration);
          check(deleteRes, {
            'room deleted': (r) => r.status === 200 || r.status === 204,
          });
        }
      }
    });
  }

  sleep(1);
}

export function teardown() {
  console.log('✅ CRUD performance test complete.');
}
