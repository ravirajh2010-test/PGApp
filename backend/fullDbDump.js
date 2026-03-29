require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const fullDatabaseDump = async () => {
  try {
    console.log('📊 FULL DATABASE DIAGNOSTIC REPORT');
    console.log('=='.repeat(50));
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log('=='.repeat(50) + '\n');

    // Check organizations
    console.log('📦 ORGANIZATIONS:');
    const orgs = await pool.query('SELECT id, name, slug, plan, status FROM organizations ORDER BY id');
    if (orgs.rows.length === 0) {
      console.log('   ❌ NO ORGANIZATIONS FOUND');
    } else {
      console.log(`   ✓ Total: ${orgs.rows.length}`);
      orgs.rows.forEach(o => console.log(`     - [${o.id}] ${o.name} (${o.slug}) - ${o.plan}`));
    }

    // Check users
    console.log('\n👥 USERS:');
    const users = await pool.query('SELECT id, name, email, role, org_id FROM users ORDER BY org_id, id');
    if (users.rows.length === 0) {
      console.log('   ❌ NO USERS FOUND');
    } else {
      console.log(`   ✓ Total: ${users.rows.length}`);
      const byOrg = {};
      users.rows.forEach(u => {
        if (!byOrg[u.org_id]) byOrg[u.org_id] = [];
        byOrg[u.org_id].push(u);
      });
      Object.entries(byOrg).forEach(([orgId, orgUsers]) => {
        console.log(`   Org ${orgId}:`);
        orgUsers.forEach(u => console.log(`     - [${u.id}] ${u.name} (${u.email}) - ${u.role}`));
      });
    }

    // Check buildings
    console.log('\n🏢 BUILDINGS:');
    const buildings = await pool.query('SELECT id, name, location, org_id FROM buildings ORDER BY org_id, id');
    if (buildings.rows.length === 0) {
      console.log('   ❌ NO BUILDINGS FOUND');
    } else {
      console.log(`   ✓ Total: ${buildings.rows.length}`);
      const byOrg = {};
      buildings.rows.forEach(b => {
        if (!byOrg[b.org_id]) byOrg[b.org_id] = [];
        byOrg[b.org_id].push(b);
      });
      Object.entries(byOrg).forEach(([orgId, orgBuildings]) => {
        console.log(`   Org ${orgId}:`);
        orgBuildings.forEach(b => console.log(`     - [${b.id}] ${b.name} @ ${b.location}`));
      });
    }

    // Check rooms
    console.log('\n🚪 ROOMS:');
    const rooms = await pool.query('SELECT id, room_number, building_id, capacity, org_id FROM rooms ORDER BY org_id, building_id, id');
    if (rooms.rows.length === 0) {
      console.log('   ❌ NO ROOMS FOUND');
    } else {
      console.log(`   ✓ Total: ${rooms.rows.length}`);
      const byOrg = {};
      rooms.rows.forEach(r => {
        if (!byOrg[r.org_id]) byOrg[r.org_id] = [];
        byOrg[r.org_id].push(r);
      });
      Object.entries(byOrg).forEach(([orgId, orgRooms]) => {
        console.log(`   Org ${orgId}:`);
        orgRooms.forEach(r => console.log(`     - [${r.id}] Room ${r.room_number} (Building ${r.building_id}, Capacity: ${r.capacity})`));
      });
    }

    // Check beds
    console.log('\n🛏️  BEDS:');
    const beds = await pool.query('SELECT id, bed_identifier, room_id, status, org_id FROM beds ORDER BY org_id, id');
    if (beds.rows.length === 0) {
      console.log('   ❌ NO BEDS FOUND');
    } else {
      console.log(`   ✓ Total: ${beds.rows.length}`);
      const byOrg = {};
      beds.rows.forEach(b => {
        if (!byOrg[b.org_id]) byOrg[b.org_id] = [];
        byOrg[b.org_id].push(b);
      });
      Object.entries(byOrg).forEach(([orgId, orgBeds]) => {
        const vacant = orgBeds.filter(b => b.status === 'vacant').length;
        const occupied = orgBeds.filter(b => b.status === 'occupied').length;
        console.log(`   Org ${orgId}: ${occupied} occupied, ${vacant} vacant`);
        orgBeds.forEach(b => console.log(`     - [${b.id}] ${b.bed_identifier} (Room ${b.room_id}) - ${b.status}`));
      });
    }

    // Check tenants
    console.log('\n🏠 TENANTS:');
    const tenants = await pool.query('SELECT id, user_id, email, rent, bed_id, org_id FROM tenants ORDER BY org_id, id');
    if (tenants.rows.length === 0) {
      console.log('   ❌ NO TENANTS FOUND');
    } else {
      console.log(`   ✓ Total: ${tenants.rows.length}`);
      const byOrg = {};
      tenants.rows.forEach(t => {
        if (!byOrg[t.org_id]) byOrg[t.org_id] = [];
        byOrg[t.org_id].push(t);
      });
      Object.entries(byOrg).forEach(([orgId, orgTenants]) => {
        console.log(`   Org ${orgId}:`);
        orgTenants.forEach(t => console.log(`     - [${t.id}] ${t.email} - ₹${t.rent} (Bed ${t.bed_id})`));
      });
    }

    // Check payments
    console.log('\n💰 PAYMENTS:');
    const payments = await pool.query('SELECT id, tenant_id, amount, status, payment_date, org_id FROM payments ORDER BY org_id, payment_date DESC LIMIT 10');
    if (payments.rows.length === 0) {
      console.log('   ❌ NO PAYMENTS FOUND');
    } else {
      console.log(`   ✓ Total: ${payments.rows.length} (showing last 10)`);
      payments.rows.forEach(p => console.log(`     - [${p.id}] Tenant ${p.tenant_id}: ₹${p.amount} - ${p.status}`));
    }

    // Summary
    console.log('\n' + '='.repeat(100));
    console.log('📈 SUMMARY:');
    console.log(`   Organizations: ${orgs.rows.length}`);
    console.log(`   Users: ${users.rows.length}`);
    console.log(`   Buildings: ${buildings.rows.length}`);
    console.log(`   Rooms: ${rooms.rows.length}`);
    console.log(`   Beds: ${beds.rows.length}`);
    console.log(`   Tenants: ${tenants.rows.length}`);
    console.log(`   Payments: ${payments.rows.length}`);
    console.log('='.repeat(100));

    // Check if database is empty
    if (orgs.rows.length === 0 && users.rows.length === 0 && buildings.rows.length === 0) {
      console.log('\n⚠️  DATABASE IS EMPTY! You need to:');
      console.log('   1. Create an organization via Super Admin panel');
      console.log('   2. Create buildings, rooms, and beds');
      console.log('   3. Create tenants');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
};

fullDatabaseDump();
