const pool = require('./src/config/database');

async function checkTenants() {
  try {
    console.log('Checking existing tenants...\n');

    const result = await pool.query('SELECT id, user_id, email, bed_id, rent FROM tenants ORDER BY id');
    
    console.log('📋 Existing Tenants:');
    console.table(result.rows);

    // Get next available ID
    const maxIdResult = await pool.query('SELECT MAX(id) as max_id FROM tenants');
    const nextId = (maxIdResult.rows[0].max_id || 0) + 1;

    console.log(`\n✅ Next available ID: ${nextId}`);
    console.log('\n💡 Use this INSERT query:\n');
    console.log(`INSERT INTO tenants (user_id, email, bed_id, start_date, end_date, rent) 
VALUES 
  (5, 'newtenant1@gmail.com', 2, '2025-03-01', '2025-08-31', 7000.00),
  (6, 'newtenant2@gmail.com', 4, '2025-03-15', '2025-09-15', 8000.00);`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTenants();
