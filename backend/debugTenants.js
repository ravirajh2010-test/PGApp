require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const debugTenants = async () => {
  try {
    console.log('🔍 Checking ALL tenants in database...\n');

    // Get all tenants regardless of relationships
    const allTenants = await pool.query('SELECT id, user_id, email, rent, bed_id, org_id FROM tenants ORDER BY id');
    console.log(`✓ Total tenants in DB: ${allTenants.rows.length}`);
    console.log(allTenants.rows.map(t => `  - ID: ${t.id}, User: ${t.user_id}, Email: ${t.email}, Bed: ${t.bed_id}, Org: ${t.org_id}`).join('\n'));

    console.log('\n🔍 Checking tenants with valid relationships (should appear in UI)...\n');

    // Get tenants that will appear in UI (with all relationships)
    const validTenants = await pool.query(`
      SELECT t.id, t.user_id, t.email, t.rent, t.bed_id, t.org_id, u.name, b.bed_identifier, r.room_number, bl.name as building_name
      FROM tenants t 
      JOIN users u ON t.user_id = u.id 
      JOIN beds b ON t.bed_id = b.id 
      JOIN rooms r ON b.room_id = r.id 
      JOIN buildings bl ON r.building_id = bl.id 
      ORDER BY t.id
    `);
    console.log(`✓ Tenants with valid relationships: ${validTenants.rows.length}`);
    console.log(validTenants.rows.map(t => `  - ID: ${t.id}, Name: ${t.name}, Email: ${t.email}`).join('\n'));

    console.log('\n🔍 Finding ORPHANED tenants (exist but missing relationships)...\n');

    // Find orphaned tenants
    const orphanedTenants = await pool.query(`
      SELECT t.id, t.user_id, t.email, t.rent, t.bed_id, t.org_id,
             CASE WHEN u.id IS NULL THEN 'MISSING_USER' ELSE 'OK' END as user_status,
             CASE WHEN b.id IS NULL THEN 'MISSING_BED' ELSE 'OK' END as bed_status,
             CASE WHEN r.id IS NULL THEN 'MISSING_ROOM' ELSE 'OK' END as room_status,
             CASE WHEN bl.id IS NULL THEN 'MISSING_BUILDING' ELSE 'OK' END as building_status
      FROM tenants t 
      LEFT JOIN users u ON t.user_id = u.id 
      LEFT JOIN beds b ON t.bed_id = b.id 
      LEFT JOIN rooms r ON b.room_id = r.id 
      LEFT JOIN buildings bl ON r.building_id = bl.id 
      WHERE u.id IS NULL OR b.id IS NULL OR r.id IS NULL OR bl.id IS NULL
      ORDER BY t.id
    `);
    
    if (orphanedTenants.rows.length === 0) {
      console.log('✅ No orphaned tenants found - all tenants have valid relationships');
    } else {
      console.log(`❌ Found ${orphanedTenants.rows.length} ORPHANED tenant(s):`);
      orphanedTenants.rows.forEach(t => {
        console.log(`\n  Tenant ID ${t.id}:`);
        console.log(`    Email: ${t.email}`);
        console.log(`    User Status: ${t.user_status} ${t.user_status === 'MISSING_USER' ? '(User ID ' + t.user_id + ' not found)' : ''}`);
        console.log(`    Bed Status: ${t.bed_status} ${t.bed_status === 'MISSING_BED' ? '(Bed ID ' + t.bed_id + ' not found)' : ''}`);
        console.log(`    Room Status: ${t.room_status}`);
        console.log(`    Building Status: ${t.building_status}`);
      });
    }

    console.log('\n' + '='.repeat(60) + '\n');
    console.log('📊 Summary:');
    console.log(`   Total Tenants: ${allTenants.rows.length}`);
    console.log(`   Visible in UI: ${validTenants.rows.length}`);
    console.log(`   Orphaned: ${orphanedTenants.rows.length}`);

    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

debugTenants();
