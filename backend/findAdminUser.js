const { Pool } = require('pg');

(async () => {
  const adminPool = new Pool({
    user: 'postgres',
    password: '1234',
    host: 'localhost',
    port: 5432,
    database: 'postgres'
  });
  
  try {
    const databases = await adminPool.query("SELECT datname FROM pg_database WHERE datname LIKE '%stay%' OR datname LIKE '%hostel%'");
    console.log('Available databases:', databases.rows);
    
    // Check each database for users
    for (const db of databases.rows) {
      try {
        const dbPool = new Pool({
          user: 'postgres',
          password: '1234',
          host: 'localhost',
          port: 5432,
          database: db.datname
        });
        
        const users = await dbPool.query("SELECT email, role FROM users WHERE email = 'admin@pgstay.com' LIMIT 1");
        if (users.rows.length > 0) {
          console.log(`✅ Found admin user in database: ${db.datname}`);
          
          // Also count all users
          const allUsers = await dbPool.query("SELECT COUNT(*) FROM users");
          console.log(`   Total users in ${db.datname}:`, allUsers.rows[0].count);
        } else {
          // Still count users
          const allUsers = await dbPool.query("SELECT COUNT(*) FROM users");
          console.log(`❌ No admin in ${db.datname} (has ${allUsers.rows[0].count} users)`);
        }
        await dbPool.end();
      } catch(e) {
        console.log(`⚠️  Error checking ${db.datname}:`, e.message);
      }
    }
    
    await adminPool.end();
  } catch(err) {
    console.error('Error:', err.message);
  }
})();
