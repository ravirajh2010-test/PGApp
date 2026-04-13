const { Pool } = require('pg');

/**
 * SchemaPool - Wraps a real Pool to scope all queries to a PostgreSQL schema.
 * Used in single-DB mode (e.g., Render free plan) where separate databases
 * cannot be created. Each org gets its own schema within the same database.
 */
class SchemaPool {
  constructor(realPool, schemaName) {
    this._pool = realPool;
    this._schema = schemaName;
  }

  async query(text, params) {
    const client = await this._pool.connect();
    try {
      await client.query(`SET search_path TO "${this._schema}", public`);
      const result = await client.query(text, params);
      return result;
    } finally {
      await client.query('RESET search_path');
      client.release();
    }
  }

  async connect() {
    const client = await this._pool.connect();
    const origRelease = client.release.bind(client);
    await client.query(`SET search_path TO "${this._schema}", public`);
    // Override release to reset search_path before returning to pool
    client.release = async () => {
      try { await client.query('RESET search_path'); } catch (e) { /* ignore */ }
      origRelease();
    };
    return client;
  }

  // Proxy end() — no-op because we share the master pool
  async end() { /* no-op */ }

  on() { /* no-op */ }
}

/**
 * DatabaseManager - Manages per-organization database isolation.
 *
 * Supports two modes:
 *   1. Multi-DB mode (default, local dev): Each org gets its own PostgreSQL database.
 *   2. Single-DB/Schema mode (USE_SINGLE_DB=true, Render free plan):
 *      Each org gets its own PostgreSQL SCHEMA within the same database.
 *      Queries are transparently scoped via search_path.
 *
 * Architecture:
 *   Master DB: organizations, plan_limits, subscriptions, invoices, super_admin users, user_org_map
 *   Per-org (DB or Schema): users, buildings, rooms, beds, tenants, payments, audit_logs
 */
class DatabaseManager {
  constructor() {
    this.pools = new Map(); // orgId -> Pool or SchemaPool
    this.masterPool = null;
    // Auto-enable single-DB mode in production (Render free plan only allows one database)
    this.singleDbMode = process.env.USE_SINGLE_DB === 'true' || process.env.NODE_ENV === 'production';
  }

  /**
   * Initialize the master pool (call once at startup)
   */
  initMasterPool() {
    if (this.masterPool) return this.masterPool;

    this.masterPool = process.env.DATABASE_URL
      ? new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          max: 10,
          min: 1,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        })
      : new Pool({
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '1234',
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          database: process.env.DB_NAME || 'pg_stay',
          max: 10,
          min: 1,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });

    this.masterPool.on('error', (err) => {
      console.error('[DB_MANAGER] Master pool error:', err);
    });

    if (this.singleDbMode) {
      console.log('[DB_MANAGER] Running in SINGLE-DB (schema) mode');
    }

    return this.masterPool;
  }

  getMasterPool() {
    if (!this.masterPool) this.initMasterPool();
    return this.masterPool;
  }

  /**
   * Get the schema name for an org
   */
  _getSchemaName(orgId) {
    return `org_${parseInt(orgId)}`;
  }

  /**
   * Get or create a connection pool for a specific org
   */
  async getOrgPool(orgId) {
    if (this.pools.has(orgId)) {
      return this.pools.get(orgId);
    }

    const master = this.getMasterPool();
    const result = await master.query(
      'SELECT database_name FROM organizations WHERE id = $1',
      [orgId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Organization ${orgId} not found`);
    }

    if (this.singleDbMode) {
      // Schema-based isolation within the same database
      const schemaName = this._getSchemaName(orgId);
      const schemaPool = new SchemaPool(master, schemaName);
      this.pools.set(orgId, schemaPool);
      return schemaPool;
    }

    // Multi-DB mode: connect to org-specific database
    const dbName = result.rows[0].database_name;
    if (!dbName) {
      throw new Error(`Organization ${orgId} has no database configured`);
    }

    const pool = this._createPool(dbName);
    this.pools.set(orgId, pool);
    return pool;
  }

  /**
   * Create a connection pool for a given database name
   */
  _createPool(dbName) {
    let pool;
    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL);
      url.pathname = '/' + dbName;
      pool = new Pool({
        connectionString: url.toString(),
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 3,
        min: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    } else {
      pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '1234',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: dbName,
        max: 3,
        min: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    }

    pool.on('error', (err) => {
      console.error(`[DB_MANAGER] Org pool (${dbName}) error:`, err);
    });

    return pool;
  }

  /**
   * Sanitize org name for use as a database name suffix.
   */
  _sanitizeDbName(orgName) {
    return orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);
  }

  /**
   * Provision a new database (or schema) for an organization.
   */
  async createOrgDatabase(orgId, orgName) {
    const master = this.getMasterPool();

    if (this.singleDbMode) {
      return this._createOrgSchema(orgId);
    }

    // --- Multi-DB mode ---
    const suffix = orgName ? this._sanitizeDbName(orgName) : `org_${parseInt(orgId)}`;
    let safeDbName = `pg_stay_${suffix}`;

    const nameConflict = await master.query(
      "SELECT id FROM organizations WHERE database_name = $1 AND id != $2",
      [safeDbName, orgId]
    );
    if (nameConflict.rows.length > 0) {
      safeDbName = `pg_stay_${suffix}_${parseInt(orgId)}`;
    }

    const exists = await master.query(
      "SELECT 1 FROM pg_database WHERE datname = $1", [safeDbName]
    );

    if (exists.rows.length === 0) {
      const client = await master.connect();
      try {
        await client.query(`CREATE DATABASE "${safeDbName}"`);
        console.log(`[DB_MANAGER] Created database: ${safeDbName}`);
      } finally {
        client.release();
      }
    }

    await master.query(
      'UPDATE organizations SET database_name = $1 WHERE id = $2',
      [safeDbName, orgId]
    );

    const orgPool = this._createPool(safeDbName);
    await this._initOrgTables(orgPool);

    this.pools.set(orgId, orgPool);
    console.log(`[DB_MANAGER] Organization ${orgId} database ready: ${safeDbName}`);
    return orgPool;
  }

  /**
   * Single-DB mode: Create a schema for the org and initialize tables within it.
   */
  async _createOrgSchema(orgId) {
    const master = this.getMasterPool();
    const schemaName = this._getSchemaName(orgId);

    await master.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    console.log(`[DB_MANAGER] Schema "${schemaName}" ensured`);

    // Mark the org with a schema-style database_name for tracking
    await master.query(
      'UPDATE organizations SET database_name = $1 WHERE id = $2',
      [`schema:${schemaName}`, orgId]
    );

    // Initialize tables within the schema
    const schemaPool = new SchemaPool(master, schemaName);
    await this._initOrgTables(schemaPool);

    this.pools.set(orgId, schemaPool);
    console.log(`[DB_MANAGER] Organization ${orgId} schema ready: ${schemaName}`);
    return schemaPool;
  }

  /**
   * Initialize org-scoped tables (WITHOUT org_id columns)
   */
  async _initOrgTables(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'tenant', 'guest')),
        is_first_login BOOLEAN DEFAULT TRUE,
        last_active TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Migration: add last_active column if missing
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;

      CREATE TABLE IF NOT EXISTS buildings (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        building_id INTEGER REFERENCES buildings(id),
        room_number VARCHAR(50) NOT NULL,
        floor_number INTEGER DEFAULT 1,
        capacity INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS beds (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id),
        bed_identifier VARCHAR(50),
        status VARCHAR(50) DEFAULT 'vacant' CHECK (status IN ('occupied', 'vacant')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        bed_id INTEGER REFERENCES beds(id),
        start_date DATE NOT NULL,
        end_date DATE,
        rent DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id),
        tenant_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(20),
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
        payment_month INTEGER NOT NULL,
        payment_year INTEGER NOT NULL,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        razorpay_payment_id VARCHAR(255),
        UNIQUE(tenant_id, payment_month, payment_year)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100),
        entity_id INTEGER,
        details JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  // Keep old name as alias for backward compatibility
  async initOrgSchema(pool) {
    return this._initOrgTables(pool);
  }

  /**
   * Get all active org pools (for scheduled tasks, stats aggregation, etc.)
   */
  async getAllOrgPools() {
    const master = this.getMasterPool();

    if (this.singleDbMode) {
      // In single-DB mode, get all active orgs and return schema pools
      const result = await master.query(
        "SELECT id FROM organizations WHERE status = 'active'"
      );
      const pools = [];
      for (const org of result.rows) {
        try {
          const pool = await this.getOrgPool(org.id);
          pools.push({ orgId: org.id, pool });
        } catch (err) {
          console.error(`[DB_MANAGER] Failed to get schema pool for org ${org.id}:`, err.message);
        }
      }
      return pools;
    }

    // Multi-DB mode
    const result = await master.query(
      "SELECT id, database_name FROM organizations WHERE status = 'active' AND database_name IS NOT NULL"
    );

    const pools = [];
    for (const org of result.rows) {
      try {
        const pool = await this.getOrgPool(org.id);
        pools.push({ orgId: org.id, pool });
      } catch (err) {
        console.error(`[DB_MANAGER] Failed to get pool for org ${org.id}:`, err.message);
      }
    }
    return pools;
  }

  /**
   * Ensure all active org schemas exist (single-DB mode startup)
   */
  async initAllOrgSchemas() {
    if (!this.singleDbMode) return;

    const master = this.getMasterPool();
    const result = await master.query("SELECT id FROM organizations WHERE status = 'active'");

    console.log(`[DB_MANAGER] Initializing schemas for ${result.rows.length} active organizations...`);
    for (const org of result.rows) {
      try {
        await this._createOrgSchema(org.id);
      } catch (err) {
        console.error(`[DB_MANAGER] Failed to init schema for org ${org.id}:`, err.message);
      }
    }
    console.log('[DB_MANAGER] All org schemas initialized');
  }

  /**
   * Destroy a pool for an org (cleanup)
   */
  async destroyOrgPool(orgId) {
    if (this.pools.has(orgId)) {
      const pool = this.pools.get(orgId);
      if (pool.end) await pool.end();
      this.pools.delete(orgId);
    }
  }

  /**
   * Graceful shutdown - destroy all pools
   */
  async destroyAll() {
    for (const [, pool] of this.pools) {
      if (pool.end) await pool.end();
    }
    this.pools.clear();
    if (this.masterPool) {
      await this.masterPool.end();
      this.masterPool = null;
    }
  }
}

// Singleton
const dbManager = new DatabaseManager();
module.exports = dbManager;
