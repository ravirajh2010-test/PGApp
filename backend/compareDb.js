const { Pool } = require('pg');

(async () => {
  const pgStay = new Pool({
    user: 'postgres',
    password: '1234',
    host: 'localhost',
    port: 5432,
    database: 'pg_stay'
  });
  
  const hostel = new Pool({
    user: 'postgres',
    password: '1234',
    host: 'localhost',
    port: 5432,
    database: 'hostel_management'
  });
  
  try {
    console.log('\n📍 PG_STAY DATABASE:');
    const pgStayUsers = await pgStay.query("SELECT id, name, email, role FROM users;");
    console.log('  Users:', pgStayUsers.rows);
    
    const pgStayBuildings = await pgStay.query("SELECT id, name FROM buildings LIMIT 3;");
    console.log('  Buildings:', pgStayBuildings.rows);
    
    console.log('\n📍 HOSTEL_MANAGEMENT DATABASE:');
    const hostelUsers = await hostel.query("SELECT id, name, email, role FROM users;");
    console.log('  Users:', hostelUsers.rows);
    
    const hostelBuildings = await hostel.query("SELECT id, name FROM buildings LIMIT 3;");
    console.log('  Buildings:', hostelBuildings.rows);
    
    pgStay.end();
    hostel.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
