const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * OrgDatabaseInitializer - Auto-creates missing organization databases (multi-DB mode only).
 * In single-DB mode (USE_SINGLE_DB=true), this is a no-op since DatabaseManager handles schemas.
 */
class OrgDatabaseInitializer {
  static async initialize() {
    // Skip in single-DB mode — schemas are initialized by DatabaseManager.initAllOrgSchemas()
    if (process.env.USE_SINGLE_DB === 'true') {
      console.log('[INIT-ORG-DB] Skipped — running in single-DB (schema) mode');
      return;
    }

    try {
      console.log('[INIT-ORG-DB] Checking organization databases...');

      // Get connection parameters
      const connParams = OrgDatabaseInitializer._getConnParams();

      // Admin pool for creating databases
      const adminPool = new Pool({
        ...connParams,
        database: 'postgres',
      });

      // Main pool for reading organization list
      const dbManager = require('./DatabaseManager');
      const mainPool = dbManager.getMasterPool();

      // Get active organizations
      const orgs = await mainPool.query(
        "SELECT id, database_name FROM organizations WHERE status = 'active' AND database_name IS NOT NULL ORDER BY id"
      );

      if (orgs.rows.length === 0) {
        console.log('[INIT-ORG-DB] No active organizations found');
        await adminPool.end();
        return;
      }

      console.log(`[INIT-ORG-DB] Processing ${orgs.rows.length} active organizations...`);

      // Read schema
      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const schemaParts = schema.split(';').filter(s => s.trim());

      let createdCount = 0;
      let existingCount = 0;

      for (const org of orgs.rows) {
        const dbName = org.database_name;

        try {
          // Check if db exists
          const checkResult = await adminPool.query(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            [dbName]
          );

          if (checkResult.rows.length > 0) {
            console.log(`[INIT-ORG-DB] ✓ ${dbName} (Org ${org.id}) exists`);
            existingCount++;
            continue;
          }

          console.log(`[INIT-ORG-DB] Creating ${dbName} (Org ${org.id})...`);
          await adminPool.query(`CREATE DATABASE ${dbName}`);

          // Create tables
          const orgConnParams = OrgDatabaseInitializer._getConnParams();
          const orgPool = new Pool({
            ...orgConnParams,
            database: dbName,
          });

          for (const part of schemaParts) {
            if (part.trim()) {
              try {
                await orgPool.query(part);
              } catch (err) {
                if (!err.message.includes('already exists') && !err.message.includes('duplicate key')) {
                  console.warn(`[INIT-ORG-DB] Warning in ${dbName}: ${err.message}`);
                }
              }
            }
          }

          await orgPool.end();
          console.log(`[INIT-ORG-DB] ✓ Created ${dbName} with schema`);
          createdCount++;
        } catch (err) {
          console.error(`[INIT-ORG-DB] ✗ Error with ${dbName}: ${err.message}`);
        }
      }

      await adminPool.end();

      console.log(`[INIT-ORG-DB] Complete: ${createdCount} created, ${existingCount} existing`);
    } catch (err) {
      console.error('[INIT-ORG-DB] Fatal error:', err.message);
    }
  }

  static _getConnParams() {
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      return {
        host: url.hostname,
        port: url.port || 5432,
        user: url.username,
        password: url.password,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      };
    }

    return {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };
  }
}

module.exports = OrgDatabaseInitializer;
