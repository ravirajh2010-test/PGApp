require('dotenv').config();
const { Pool } = require('pg');

const checkDatabases = async () => {
  try {
    console.log('🔍 DATABASE CONNECTION CHECK\n');
    
    // Check your .env configured database
    const mainPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
    });

    console.log('📍 Configured Database (.env):');
    console.log(`   Host: ${process.env.DB_HOST}`);
    console.log(`   Port: ${process.env.DB_PORT}`);
    console.log(`   Database: ${process.env.DB_NAME}`);
    
    // Test connection and get version
    try {
      const result = await mainPool.query('SELECT version()');
      console.log(`   ✅ CONNECTED`);
      console.log(`   Version: ${result.rows[0].version.substring(0, 50)}...\n`);
    } catch (err) {
      console.log(`   ❌ CONNECTION FAILED: ${err.message}\n`);
    }

    // Count org data
    console.log('📊 Data in this database:');
    const orgs = await mainPool.query('SELECT COUNT(*) as count FROM organizations');
    const users = await mainPool.query('SELECT COUNT(*) as count FROM users');
    const tenants = await mainPool.query('SELECT COUNT(*) as count FROM tenants');
    const buildings = await mainPool.query('SELECT COUNT(*) as count FROM buildings');
    
    console.log(`   Organizations: ${orgs.rows[0].count}`);
    console.log(`   Users: ${users.rows[0].count}`);
    console.log(`   Tenants: ${tenants.rows[0].count}`);
    console.log(`   Buildings: ${buildings.rows[0].count}\n`);

    // Try to detect other PostgreSQL instances
    console.log('🔎 Checking for other PostgreSQL instances...\n');
    
    const commonPorts = [5432, 5433, 5434, 15432];
    for (const port of commonPorts) {
      try {
        const testPool = new Pool({
          user: 'postgres',
          password: process.env.DB_PASSWORD,
          host: 'localhost',
          port: port,
          database: 'postgres',
          ssl: false,
        });

        const versionResult = await testPool.query('SELECT version()');
        const hostelResult = await testPool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'organizations' AND table_schema = 'public'
          ) as has_hostel_db
        `);

        const hasHostelDb = hostelResult.rows[0].has_hostel_db;
        
        console.log(`   Port ${port}: ✅ CONNECTED`);
        console.log(`      Version: ${versionResult.rows[0].version.substring(0, 40)}...`);
        console.log(`      Has hostel_management tables: ${hasHostelDb ? '✓ YES' : '✗ NO'}`);
        console.log();

        testPool.end();
      } catch (error) {
        // Port not available
      }
    }

    await mainPool.end();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
};

checkDatabases();
