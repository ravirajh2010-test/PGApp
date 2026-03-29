require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query(`
  DROP TABLE IF EXISTS audit_logs CASCADE;
  DROP TABLE IF EXISTS invoices CASCADE;
  DROP TABLE IF EXISTS subscriptions CASCADE;
  DROP TABLE IF EXISTS plan_limits CASCADE;
  DROP TABLE IF EXISTS payments CASCADE;
  DROP TABLE IF EXISTS tenants CASCADE;
  DROP TABLE IF EXISTS beds CASCADE;
  DROP TABLE IF EXISTS rooms CASCADE;
  DROP TABLE IF EXISTS buildings CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
  DROP TABLE IF EXISTS organizations CASCADE;
`, (err) => {
  if(err) {
    console.error('Error dropping tables:', err.message);
  } else {
    console.log('✓ All tables dropped successfully');
  }
  pool.end();
});
