const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

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
    if (admin.rows.length === 0) {
      console.log('âŒ Admin not found in pg_stay');
      process.exit(1);
    }
    
    const adminUser = admin.rows[0];
    console.log('âœ… Found admin in pg_stay:', adminUser.name);
    
    // Delete existing admin if any, then insert
    await hostel.query("DELETE FROM users WHERE email = 'admin@roomipilot.com'");
    console.log('â„¹ï¸  Cleared any existing admin');
    
    console.log('âœ… Inserting admin into hostel_management');
    await hostel.query(
      "INSERT INTO users (name, email, password, role, is_first_login) VALUES ($1, $2, $3, $4, $5)",
      [adminUser.name, adminUser.email, adminUser.password, adminUser.role, adminUser.is_first_login]
    );
    
    // Verify
    const verification = await hostel.query("SELECT id, name, email, role FROM users WHERE email = 'admin@roomipilot.com'");
    console.log('âœ… Admin now in hostel_management:', verification.rows[0]);
    
    hostel.end();
    pgStay.end();
    process.exit(0);
  } catch (err) {
    console.error('âŒ Error:', err.message);
    process.exit(1);
  }
})();
