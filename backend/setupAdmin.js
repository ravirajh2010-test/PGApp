const { Pool } = require('pg');

(async () => {
  const hostel = new Pool({
    user: 'postgres',
    password: '1234',
    host: 'localhost',
    port: 5432,
    database: 'hostel_management'
  });
  
  const pgStay = new Pool({
    user: 'postgres',
    password: '1234',
    host: 'localhost',
    port: 5432,
    database: 'pg_stay'
  });
  
  try {
    // Get admin from pg_stay
    const admin = await pgStay.query("SELECT * FROM users WHERE email = 'admin@roomipilot.com'");
    const adminUser = admin.rows[0];
    console.log('âœ… Admin from pg_stay:', adminUser.name, '(ID:', adminUser.id, ')');
    
    // Just update the password for ID 1 in hostel_management
    console.log('âœ… Updating admin user in hostel_management');
    await hostel.query(
      "UPDATE users SET email = $1, password = $2, name = $3, role = $4, is_first_login = $5 WHERE id = 1",
      [adminUser.email, adminUser.password, adminUser.name, adminUser.role, adminUser.is_first_login]
    );
    
    // Verify
    const verification = await hostel.query("SELECT id, name, email, role FROM users WHERE id = 1");
    console.log('âœ… Updated user in hostel_management:', verification.rows[0]);
    
    hostel.end();
    pgStay.end();
    process.exit(0);
  } catch (err) {
    console.error('âŒ Error:', err.message);
    process.exit(1);
  }
})();
