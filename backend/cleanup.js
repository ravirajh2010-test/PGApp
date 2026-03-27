const pool = require('./src/config/database');

async function cleanupData() {
  try {
    console.log('🔄 Cleaning up test data...\n');

    // Delete payments for tenant user_id 2 and 3
    const deletePaymentsResult = await pool.query(`
      DELETE FROM payments 
      WHERE tenant_id IN (
        SELECT id FROM tenants WHERE user_id IN (2, 3)
      )
    `);
    console.log(`✅ Deleted ${deletePaymentsResult.rowCount} payment records`);

    // Delete tenants
    const deleteTenantsResult = await pool.query(`
      DELETE FROM tenants WHERE user_id IN (2, 3)
    `);
    console.log(`✅ Deleted ${deleteTenantsResult.rowCount} tenant records`);

    // Delete users
    const deleteUsersResult = await pool.query(`
      DELETE FROM users WHERE id IN (2, 3)
    `);
    console.log(`✅ Deleted ${deleteUsersResult.rowCount} user records`);

    // Check remaining data
    const usersResult = await pool.query('SELECT id, email, role FROM users');
    console.log('\n📋 Remaining Users:');
    console.table(usersResult.rows);

    const tenantsResult = await pool.query('SELECT id, user_id, bed_id FROM tenants');
    console.log('\n📋 Remaining Tenants:');
    console.table(tenantsResult.rows);

    await pool.end();
    console.log('\n✅ Cleanup completed successfully!');
    console.log('You can now create new tenants with those email addresses.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupData();
