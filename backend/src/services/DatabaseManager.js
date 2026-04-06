const { Pool } = require('pg');

/**
 * DatabaseManager - Manages separate PostgreSQL database per organization.
 * 
 * Architecture:
 *   Master DB (pg_stay): organizations, plan_limits, subscriptions, invoices, super_admin users, user_org_map
 *   Per-org DB (pg_stay_org_{id}): users, buildings, rooms, beds, tenants, payments, audit_logs
 */
class DatabaseManager {
  constructor() {
    this.pools = new Map(); // orgId -> Pool
    this.masterPool = null;
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
          max: 5,
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
          max: 5,
          min: 1,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });

    this.masterPool.on('error', (err) => {
      console.error('[DB_MANAGER] Master pool error:', err);
    });

    return this.masterPool;
  }

  getMasterPool() {
    if (!this.masterPool) this.initMasterPool();
    return this.masterPool;
  }

  /**
   * Get or create a connection pool for a specific org database
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
   * Converts to lowercase, replaces non-alphanumeric chars with underscores, trims.
   */
  _sanitizeDbName(orgName) {
    return orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);
  }

  /**
   * Provision a new database for an organization.
   * Creates the database, runs the schema, and stores the mapping.
   * @param {number} orgId - Organization ID
   * @param {string} orgName - Business name (used for database naming: pg_stay_<orgname>)
   */
  async createOrgDatabase(orgId, orgName) {
    const master = this.getMasterPool();

    // Build database name from org name, fallback to org ID if name not provided
    const suffix = orgName ? this._sanitizeDbName(orgName) : `org_${parseInt(orgId)}`;
    let safeDbName = `pg_stay_${suffix}`;

    // Ensure uniqueness: if a DB with this name already exists for a different org, append the ID
    const nameConflict = await master.query(
      "SELECT id FROM organizations WHERE database_name = $1 AND id != $2",
      [safeDbName, orgId]
    );
    if (nameConflict.rows.length > 0) {
      safeDbName = `pg_stay_${suffix}_${parseInt(orgId)}`;
    }

    // Check if database already exists
    const exists = await master.query(
      "SELECT 1 FROM pg_database WHERE datname = $1", [safeDbName]
    );

    if (exists.rows.length === 0) {
      // CREATE DATABASE cannot run inside a transaction block
      // Use a fresh client from master pool  
      const client = await master.connect();
      try {
        await client.query(`CREATE DATABASE "${safeDbName}"`);
        console.log(`[DB_MANAGER] Created database: ${safeDbName}`);
      } finally {
        client.release();
      }
    }

    // Update organization with database_name
    await master.query(
      'UPDATE organizations SET database_name = $1 WHERE id = $2',
      [safeDbName, orgId]
    );

    // Initialize schema in the new database
    const orgPool = this._createPool(safeDbName);
    await this.initOrgSchema(orgPool);

    this.pools.set(orgId, orgPool);
    console.log(`[DB_MANAGER] Organization ${orgId} database ready: ${safeDbName}`);
    return orgPool;
  }

  /**
   * Initialize org-scoped tables (WITHOUT org_id columns)
   */
  async initOrgSchema(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'tenant', 'guest')),
        is_first_login BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

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

  /**
   * Get all active org pools (for scheduled tasks like checkout)
   */
  async getAllOrgPools() {
    const master = this.getMasterPool();
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
   * Destroy a pool for an org (cleanup)
   */
  async destroyOrgPool(orgId) {
    if (this.pools.has(orgId)) {
      await this.pools.get(orgId).end();
      this.pools.delete(orgId);
    }
  }

  /**
   * Graceful shutdown - destroy all pools
   */
  async destroyAll() {
    for (const [, pool] of this.pools) {
      await pool.end();
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
