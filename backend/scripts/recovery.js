/**
 * Recovery Script - Clears all org databases to reset connection pool
 * Run this if you get "too many clients" errors
 */
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'pg_stay',
  max: 1, // Minimal connections
  idleTimeoutMillis: 1000,
});

async function recoverDatabase() {
  try {
    console.log('Starting database recovery...');
    
    // Get all org databases
    const result = await pool.query(`
      SELECT datname FROM pg_database 
      WHERE datname LIKE 'pg_stay_org_%'
    `);

    // Drop all org databases
    for (const db of result.rows) {
      try {
        console.log(`Dropping database: ${db.datname}`);
        // Terminate all connections first
        await pool.query(`
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = $1 AND pid <> pg_backend_pid()
        `, [db.datname]);
        
        // Now drop the database
        await pool.query(`DROP DATABASE IF EXISTS "${db.datname}"`);
        console.log(`✓ Dropped ${db.datname}`);
      } catch (e) {
        console.error(`Failed to drop ${db.datname}: ${e.message}`);
      }
    }

    // Clear the database_name from organizations table
    try {
      await pool.query('UPDATE organizations SET database_name = NULL');
      console.log('✓ Cleared database_name mappings');
    } catch (e) {
      console.warn('Could not clear database_name (tables may not exist yet)');
    }

    console.log('\n✓ Database recovery complete!');
    console.log('You can now restart the backend');
    
    await pool.end();
  } catch (error) {
    console.error('Recovery failed:', error.message);
    process.exit(1);
  }
}

recoverDatabase();
