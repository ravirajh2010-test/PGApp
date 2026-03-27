const { Pool } = require('pg');

(async () => {
  // List all databases
  const adminPool = new Pool({
    user: 'postgres',
    password: '1234',
    host: 'localhost',
    port: 5432,
    database: 'postgres'
  });
  
  try {
    const dbs = await adminPool.query("SELECT datname FROM pg_database WHERE datistemplate = false;");
    console.log('\n📊 All databases:');
    dbs.rows.forEach(db => console.log('  -', db.datname));
    
    // Check each database for admin@pgstay.com
    for (const db of dbs.rows) {
      try {
        const testPool = new Pool({
          user: 'postgres',
          password: '1234',
          host: 'localhost',
          port: 5432,
          database: db.datname
        });
        
        const users = await testPool.query("SELECT COUNT(*) FROM users WHERE email = 'admin@pgstay.com';");
        const count = users.rows[0].count;
        if (count > 0) {
          console.log(`\n✅ Found admin@pgstay.com in database: ${db.datname}`);
          const userData = await testPool.query("SELECT id, name, email, role FROM users WHERE email = 'admin@pgstay.com';");
          console.log('   User:', userData.rows[0]);
        }
        testPool.end();
      } catch (err) {
        // Database might not have users table
      }
    }
    
    adminPool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
