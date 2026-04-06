/**
 * Migration script: Shared database → Per-org database architecture
 * 
 * This script migrates data from the shared database (where all orgs share tables
 * with org_id columns) to separate per-org databases.
 * 
 * What it does:
 * 1. Adds database_name column to organizations table if missing
 * 2. Creates user_org_map table if missing
 * 3. For each organization:
 *    a. Creates a new database (pg_stay_org_{id})
 *    b. Initializes the org schema (tables without org_id)
 *    c. Copies users, buildings, rooms, beds, tenants, payments, audit_logs
 *    d. Populates user_org_map entries
 *    e. Updates organizations.database_name
 * 
 * Usage: node backend/scripts/migrate-to-per-org-db.js
 * 
 * IMPORTANT: Back up your database before running this script!
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { Pool } = require('pg');
const dbManager = require('../src/services/DatabaseManager');

const masterPool = dbManager.initMasterPool();

async function migrate() {
  console.log('=== Per-Org Database Migration ===\n');

  // Step 1: Ensure database_name column exists
  console.log('Step 1: Ensuring database_name column exists...');
  await masterPool.query(`
    DO $$ BEGIN
      ALTER TABLE organizations ADD COLUMN IF NOT EXISTS database_name VARCHAR(255);
    EXCEPTION WHEN duplicate_column THEN NULL;
    END $$;
  `);

  // Step 2: Create user_org_map table
  console.log('Step 2: Creating user_org_map table...');
  await masterPool.query(`
    CREATE TABLE IF NOT EXISTS user_org_map (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL,
      role VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(email, org_id)
    );
  `);
  await masterPool.query('CREATE INDEX IF NOT EXISTS idx_user_org_map_email ON user_org_map(email)');

  // Step 3: Get all organizations that haven't been migrated yet
  const orgsResult = await masterPool.query(
    "SELECT id, name, slug FROM organizations WHERE database_name IS NULL ORDER BY id"
  );

  if (orgsResult.rows.length === 0) {
    console.log('\nNo organizations need migration. All done!');
    await masterPool.end();
    return;
  }

  console.log(`\nStep 3: Migrating ${orgsResult.rows.length} organization(s)...\n`);

  for (const org of orgsResult.rows) {
    console.log(`--- Migrating org ${org.id}: ${org.name} (${org.slug}) ---`);

    try {
      // Create org database and initialize schema (named after business name)
      const orgPool = await dbManager.createOrgDatabase(org.id, org.name);

      // Copy users (exclude super_admin - they stay in master DB)
      console.log('  Copying users...');
      const usersResult = await masterPool.query(
        "SELECT id, name, email, password, role, is_first_login, created_at FROM users WHERE org_id = $1 AND role != 'super_admin'",
        [org.id]
      );

      for (const user of usersResult.rows) {
        const insertResult = await orgPool.query(
          'INSERT INTO users (name, email, password, role, is_first_login, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          [user.name, user.email, user.password, user.role, user.is_first_login, user.created_at]
        );

        // Add to user_org_map
        await masterPool.query(
          'INSERT INTO user_org_map (email, org_id, user_id, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email, org_id) DO NOTHING',
          [user.email, org.id, insertResult.rows[0].id, user.role]
        );
      }
      console.log(`  ${usersResult.rows.length} users copied`);

      // Copy buildings
      console.log('  Copying buildings...');
      const buildingsResult = await masterPool.query(
        'SELECT id, name, location, created_at FROM buildings WHERE org_id = $1 ORDER BY id',
        [org.id]
      );
      const buildingIdMap = {};
      for (const b of buildingsResult.rows) {
        const r = await orgPool.query(
          'INSERT INTO buildings (name, location, created_at) VALUES ($1, $2, $3) RETURNING id',
          [b.name, b.location, b.created_at]
        );
        buildingIdMap[b.id] = r.rows[0].id;
      }
      console.log(`  ${buildingsResult.rows.length} buildings copied`);

      // Copy rooms
      console.log('  Copying rooms...');
      const roomsResult = await masterPool.query(
        'SELECT id, building_id, room_number, floor_number, capacity, created_at FROM rooms WHERE org_id = $1 ORDER BY id',
        [org.id]
      );
      const roomIdMap = {};
      for (const r of roomsResult.rows) {
        const newBuildingId = buildingIdMap[r.building_id];
        if (!newBuildingId) {
          console.warn(`  WARNING: Room ${r.id} references unknown building ${r.building_id}, skipping`);
          continue;
        }
        const res = await orgPool.query(
          'INSERT INTO rooms (building_id, room_number, floor_number, capacity, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [newBuildingId, r.room_number, r.floor_number, r.capacity, r.created_at]
        );
        roomIdMap[r.id] = res.rows[0].id;
      }
      console.log(`  ${roomsResult.rows.length} rooms copied`);

      // Copy beds
      console.log('  Copying beds...');
      const bedsResult = await masterPool.query(
        'SELECT id, room_id, bed_identifier, status, created_at FROM beds WHERE org_id = $1 ORDER BY id',
        [org.id]
      );
      const bedIdMap = {};
      for (const b of bedsResult.rows) {
        const newRoomId = roomIdMap[b.room_id];
        if (!newRoomId) {
          console.warn(`  WARNING: Bed ${b.id} references unknown room ${b.room_id}, skipping`);
          continue;
        }
        const res = await orgPool.query(
          'INSERT INTO beds (room_id, bed_identifier, status, created_at) VALUES ($1, $2, $3, $4) RETURNING id',
          [newRoomId, b.bed_identifier, b.status, b.created_at]
        );
        bedIdMap[b.id] = res.rows[0].id;
      }
      console.log(`  ${bedsResult.rows.length} beds copied`);

      // Copy tenants (need to map user_id and bed_id)
      console.log('  Copying tenants...');
      const tenantsResult = await masterPool.query(
        'SELECT id, user_id, email, phone, bed_id, start_date, end_date, rent, created_at FROM tenants WHERE org_id = $1 ORDER BY id',
        [org.id]
      );

      // Build user ID mapping (old master ID -> new org DB ID)
      const userIdMap = {};
      const orgUsers = await orgPool.query('SELECT id, email FROM users');
      const masterUsers = await masterPool.query(
        'SELECT id, email FROM users WHERE org_id = $1',
        [org.id]
      );
      for (const mu of masterUsers.rows) {
        const ou = orgUsers.rows.find(u => u.email === mu.email);
        if (ou) userIdMap[mu.id] = ou.id;
      }

      const tenantIdMap = {};
      for (const t of tenantsResult.rows) {
        const newUserId = userIdMap[t.user_id];
        const newBedId = bedIdMap[t.bed_id];
        if (!newUserId || !newBedId) {
          console.warn(`  WARNING: Tenant ${t.id} has unmapped user/bed, skipping`);
          continue;
        }
        const res = await orgPool.query(
          'INSERT INTO tenants (user_id, email, phone, bed_id, start_date, end_date, rent, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
          [newUserId, t.email, t.phone, newBedId, t.start_date, t.end_date, t.rent, t.created_at]
        );
        tenantIdMap[t.id] = res.rows[0].id;
      }
      console.log(`  ${tenantsResult.rows.length} tenants copied`);

      // Copy payments
      console.log('  Copying payments...');
      const paymentsResult = await masterPool.query(
        'SELECT id, tenant_id, amount, status, payment_date, razorpay_payment_id FROM payments WHERE org_id = $1 ORDER BY id',
        [org.id]
      );
      let paymentsCopied = 0;
      for (const p of paymentsResult.rows) {
        const newTenantId = tenantIdMap[p.tenant_id];
        if (!newTenantId) continue;
        await orgPool.query(
          'INSERT INTO payments (tenant_id, amount, status, payment_date, razorpay_payment_id) VALUES ($1, $2, $3, $4, $5)',
          [newTenantId, p.amount, p.status, p.payment_date, p.razorpay_payment_id]
        );
        paymentsCopied++;
      }
      console.log(`  ${paymentsCopied} payments copied`);

      // Copy audit logs
      console.log('  Copying audit logs...');
      const logsResult = await masterPool.query(
        'SELECT user_id, action, entity_type, entity_id, details, ip_address, created_at FROM audit_logs WHERE org_id = $1 ORDER BY id',
        [org.id]
      );
      for (const log of logsResult.rows) {
        const newUserId = userIdMap[log.user_id] || null;
        await orgPool.query(
          'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [newUserId, log.action, log.entity_type, log.entity_id, log.details, log.ip_address, log.created_at]
        );
      }
      console.log(`  ${logsResult.rows.length} audit logs copied`);

      console.log(`  ✅ Org ${org.id} (${org.name}) migration complete!\n`);
    } catch (error) {
      console.error(`  ❌ Error migrating org ${org.id}:`, error.message);
      console.error('  Continuing with next org...\n');
    }
  }

  console.log('=== Migration Complete ===');
  console.log('Old data in shared tables has NOT been deleted.');
  console.log('Once verified, you can clean up the old org-scoped data from the master database.');

  // destroyAll() already closes masterPool, so no separate end() needed
  await dbManager.destroyAll();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
