const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'pg_stay',
    });

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;