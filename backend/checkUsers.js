const pool = require('./src/config/database');

async function checkAndCleanupUsers() {
  try {
    // Get all users
    const usersResult = await pool.query('SELECT id, email, role FROM users ORDER BY id DESC LIMIT 10');
    console.log('\n📋 Last 10 Users in Database:');
    console.table(usersResult.rows);

    // Get all tenants
    const tenantsResult = await pool.query('SELECT id, user_id, bed_id FROM tenants ORDER BY id DESC LIMIT 10');
    console.log('\n📋 Last 10 Tenants in Database:');
    console.table(tenantsResult.rows);

    // Find users without tenants (orphaned users)
    const orphanedResult = await pool.query(`
      SELECT u.id, u.name, u.email 
      FROM users u 
      LEFT JOIN tenants t ON u.id = t.user_id 
      WHERE u.role = 'tenant' AND t.id IS NULL
    `);
    
    if (orphanedResult.rows.length > 0) {
      console.log('\n⚠️  Orphaned Tenant Users (no tenant record):');
      console.table(orphanedResult.rows);
      
      console.log('\n🔧 To delete these orphaned users, run:');
      orphanedResult.rows.forEach(user => {
        console.log(`   DELETE FROM users WHERE id = ${user.id}; -- ${user.email}`);
      });
    } else {
      console.log('\n✅ No orphaned users found');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAndCleanupUsers();
