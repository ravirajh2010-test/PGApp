/**
 * Flushes local PostgreSQL data for fresh UI testing (development only).
 *
 * - Drops all org databases named pg_stay_* (multi-DB mode)
 * - Drops and recreates the master DB (DB_NAME from .env, default hostel_management)
 *
 * Usage: from backend folder, with Postgres running:
 *   node scripts/flush-local-db.js
 *
 * Stop the backend dev server first so pools do not hold connections.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const masterDbName = process.env.DB_NAME || 'hostel_management';

function assertSafeDbName(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Refusing unsafe database name: ${name}`);
  }
}

async function terminateConnections(pool, dbName) {
  await pool.query(
    `
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = $1 AND pid <> pg_backend_pid()
  `,
    [dbName]
  );
}

async function dropDatabase(pool, dbName) {
  assertSafeDbName(dbName);
  await terminateConnections(pool, dbName);
  await pool.query(`DROP DATABASE IF EXISTS "${dbName}"`);
}

(async () => {
  const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: 'postgres',
    max: 2,
  });

  try {
    console.log('[flush-local-db] Connected to postgres maintenance DB');

    const orgDbs = await pool.query(`
      SELECT datname FROM pg_database
      WHERE datistemplate = false
        AND datname ~ '^pg_stay_'
    `);

    for (const row of orgDbs.rows) {
      const db = row.datname;
      console.log('[flush-local-db] Dropping org database:', db);
      await dropDatabase(pool, db);
    }

    console.log('[flush-local-db] Dropping master database:', masterDbName);
    await dropDatabase(pool, masterDbName);

    console.log('[flush-local-db] Creating empty master database:', masterDbName);
    assertSafeDbName(masterDbName);
    await pool.query(`CREATE DATABASE "${masterDbName}"`);

    console.log('[flush-local-db] Done.');
    console.log('[flush-local-db] Start the backend again; it will recreate tables and seed plan limits / super admin if needed.');
  } catch (err) {
    console.error('[flush-local-db] Failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
