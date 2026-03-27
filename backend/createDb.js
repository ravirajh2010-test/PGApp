const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'postgres', // Connect to default postgres db
});

const createDatabase = async () => {
  try {
    console.log('Creating database pg_stay...');
    
    // Check if database exists
    const result = await pool.query("SELECT 1 FROM pg_database WHERE datname = 'pg_stay'");
    
    if (result.rows.length > 0) {
      console.log('✅ Database pg_stay already exists');
    } else {
      await pool.query('CREATE DATABASE pg_stay');
      console.log('✅ Database pg_stay created successfully');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error creating database:', error.message);
    process.exit(1);
  }
};

createDatabase();