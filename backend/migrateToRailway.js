require('dotenv').config();
const { Pool } = require('pg');

// ========== CONFIG ==========
const LOCAL_URL = process.env.DATABASE_URL; // local hostel_management
const RAILWAY_URL = process.argv[2]; // passed as command line arg

if (!RAILWAY_URL) {
  console.error('Usage: node migrateToRailway.js <RAILWAY_PUBLIC_DATABASE_URL>');
  process.exit(1);
}

// Local master pool
const localPool = new Pool({
  connectionString: LOCAL_URL,
  ssl: false,
});

// Railway pool
const railwayPool = new Pool({
  connectionString: RAILWAY_URL,
  ssl: { rejectUnauthorized: false },
});

// Create a local org pool
function createLocalOrgPool(dbName) {
  const url = new URL(LOCAL_URL);
  url.pathname = '/' + dbName;
  return new Pool({ connectionString: url.toString(), ssl: false });
}

// ========== HELPERS ==========
async function copyTable(srcPool, destPool, table, columns, schemaPrefix = '') {
  const fullTable = schemaPrefix ? `"${schemaPrefix}".${table}` : table;
  const rows = await srcPool.query(`SELECT * FROM ${table} ORDER BY id`);
  
  if (rows.rows.length === 0) {
    console.log(`  ${table}: 0 rows (skipped)`);
    return;
  }

  for (const row of rows.rows) {
    const cols = columns.filter(c => row[c] !== undefined);
    const vals = cols.map(c => row[c]);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
    const colNames = cols.join(', ');

    try {
      await destPool.query(
        `INSERT INTO ${fullTable} (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        vals
      );
    } catch (err) {
      // Try without ON CONFLICT for tables that may not have unique constraints
      try {
        await destPool.query(
          `INSERT INTO ${fullTable} (${colNames}) VALUES (${placeholders})`,
          vals
        );
      } catch (err2) {
        console.warn(`  Warning: ${table} row id=${row.id}: ${err2.message}`);
      }
    }
  }

  console.log(`  ${table}: ${rows.rows.length} rows migrated`);
}

// ========== MAIN ==========
async function migrate() {
  try {
    console.log('=== MIGRATING LOCAL DATA TO RAILWAY ===\n');

    // Test connections
    await localPool.query('SELECT 1');
    console.log('✓ Connected to local database');
    await railwayPool.query('SELECT 1');
    console.log('✓ Connected to Railway database\n');

    // ---- 1. Migrate master tables ----
    console.log('--- Master Tables ---');

    // Organizations
    await copyTable(localPool, railwayPool, 'organizations', [
      'id', 'name', 'slug', 'email', 'phone', 'address', 'logo_url',
      'plan', 'status', 'max_properties', 'max_beds', 'max_users',
      'database_name', 'created_at', 'updated_at'
    ]);

    // Fix sequences
    await railwayPool.query(`SELECT setval('organizations_id_seq', (SELECT COALESCE(MAX(id), 0) FROM organizations))`);

    // Plan limits
    await copyTable(localPool, railwayPool, 'plan_limits', [
      'id', 'plan', 'max_properties', 'max_beds', 'max_users',
      'price_monthly', 'price_yearly', 'features'
    ]);

    // Subscriptions
    try {
      await copyTable(localPool, railwayPool, 'subscriptions', [
        'id', 'org_id', 'plan', 'status', 'amount', 'billing_cycle',
        'current_period_start', 'current_period_end', 'razorpay_subscription_id',
        'created_at', 'updated_at'
      ]);
      await railwayPool.query(`SELECT setval('subscriptions_id_seq', (SELECT COALESCE(MAX(id), 0) FROM subscriptions))`);
    } catch (e) { console.log(`  subscriptions: ${e.message}`); }

    // Invoices
    try {
      await copyTable(localPool, railwayPool, 'invoices', [
        'id', 'org_id', 'subscription_id', 'amount', 'status',
        'invoice_date', 'due_date', 'paid_at', 'razorpay_payment_id', 'description'
      ]);
      await railwayPool.query(`SELECT setval('invoices_id_seq', (SELECT COALESCE(MAX(id), 0) FROM invoices))`);
    } catch (e) { console.log(`  invoices: ${e.message}`); }

    // Master users (super_admin)
    const masterUsers = await localPool.query("SELECT * FROM users WHERE role = 'super_admin' OR org_id IS NULL ORDER BY id");
    for (const user of masterUsers.rows) {
      try {
        await railwayPool.query(
          `INSERT INTO users (id, name, email, password, role, is_first_login, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
          [user.id, user.name, user.email, user.password, user.role, user.is_first_login, user.created_at]
        );
      } catch (e) { /* skip duplicates */ }
    }
    console.log(`  master users: ${masterUsers.rows.length} rows`);
    await railwayPool.query(`SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 0) FROM users))`);

    // User-org map
    try {
      await copyTable(localPool, railwayPool, 'user_org_map', [
        'id', 'email', 'org_id', 'user_id', 'role', 'created_at'
      ]);
      await railwayPool.query(`SELECT setval('user_org_map_id_seq', (SELECT COALESCE(MAX(id), 0) FROM user_org_map))`);
    } catch (e) { console.log(`  user_org_map: ${e.message}`); }

    // ---- 2. Migrate per-org data into schemas ----
    console.log('\n--- Per-Organization Data (Schemas) ---');

    const orgs = await localPool.query(
      "SELECT id, name, database_name FROM organizations WHERE database_name IS NOT NULL ORDER BY id"
    );

    const orgSchema = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL, role VARCHAR(50) NOT NULL, is_first_login BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS buildings (
        id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY, building_id INTEGER REFERENCES buildings(id),
        room_number VARCHAR(50) NOT NULL, floor_number INTEGER DEFAULT 1, capacity INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS beds (
        id SERIAL PRIMARY KEY, room_id INTEGER REFERENCES rooms(id),
        bed_identifier VARCHAR(50), status VARCHAR(50) DEFAULT 'vacant',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), email VARCHAR(255) NOT NULL,
        phone VARCHAR(20), bed_id INTEGER REFERENCES beds(id), start_date DATE NOT NULL,
        end_date DATE, rent DECIMAL(10,2) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY, tenant_id INTEGER REFERENCES tenants(id), tenant_name VARCHAR(255),
        email VARCHAR(255), phone VARCHAR(20), amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending', payment_month INTEGER NOT NULL,
        payment_year INTEGER NOT NULL, payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        razorpay_payment_id VARCHAR(255)
      );
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY, user_id INTEGER, action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100), entity_id INTEGER, details JSONB,
        ip_address VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    for (const org of orgs.rows) {
      const schemaName = `org_${org.id}`;
      console.log(`\nOrg ${org.id} (${org.name}) → schema "${schemaName}":`);

      // Create schema + tables on Railway
      await railwayPool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      const client = await railwayPool.connect();
      try {
        await client.query(`SET search_path TO "${schemaName}", public`);
        await client.query(orgSchema);
        await client.query('RESET search_path');
      } finally {
        client.release();
      }

      // Update org database_name in Railway
      await railwayPool.query(
        `UPDATE organizations SET database_name = $1 WHERE id = $2`,
        [`schema:${schemaName}`, org.id]
      );

      // Connect to local org database
      let localOrgPool;
      try {
        localOrgPool = createLocalOrgPool(org.database_name);
        await localOrgPool.query('SELECT 1'); // test connection
      } catch (err) {
        console.log(`  Skipped — local DB "${org.database_name}" not accessible: ${err.message}`);
        continue;
      }

      // Create a wrapper to insert into schema
      const schemaInsert = {
        query: async (text, params) => {
          const client = await railwayPool.connect();
          try {
            await client.query(`SET search_path TO "${schemaName}", public`);
            const result = await client.query(text, params);
            await client.query('RESET search_path');
            return result;
          } finally {
            client.release();
          }
        }
      };

      // Copy each table
      const tables = [
        { name: 'users', cols: ['id', 'name', 'email', 'password', 'role', 'is_first_login', 'created_at'] },
        { name: 'buildings', cols: ['id', 'name', 'location', 'created_at'] },
        { name: 'rooms', cols: ['id', 'building_id', 'room_number', 'floor_number', 'capacity', 'created_at'] },
        { name: 'beds', cols: ['id', 'room_id', 'bed_identifier', 'status', 'created_at'] },
        { name: 'tenants', cols: ['id', 'user_id', 'email', 'phone', 'bed_id', 'start_date', 'end_date', 'rent', 'created_at'] },
        { name: 'payments', cols: ['id', 'tenant_id', 'tenant_name', 'email', 'phone', 'amount', 'status', 'payment_month', 'payment_year', 'payment_date', 'razorpay_payment_id'] },
        { name: 'audit_logs', cols: ['id', 'user_id', 'action', 'entity_type', 'entity_id', 'details', 'ip_address', 'created_at'] },
      ];

      for (const table of tables) {
        try {
          const rows = await localOrgPool.query(`SELECT * FROM ${table.name} ORDER BY id`);
          if (rows.rows.length === 0) {
            console.log(`  ${table.name}: 0 rows`);
            continue;
          }

          for (const row of rows.rows) {
            const cols = table.cols.filter(c => row[c] !== undefined);
            const vals = cols.map(c => row[c]);
            const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
            try {
              await schemaInsert.query(
                `INSERT INTO ${table.name} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
                vals
              );
            } catch (err) {
              // skip
            }
          }

          // Fix sequence
          try {
            await schemaInsert.query(`SELECT setval('${table.name}_id_seq', (SELECT COALESCE(MAX(id), 0) FROM ${table.name}))`);
          } catch (e) { /* ignore */ }

          console.log(`  ${table.name}: ${rows.rows.length} rows`);
        } catch (err) {
          console.log(`  ${table.name}: skipped (${err.message})`);
        }
      }

      await localOrgPool.end();
    }

    console.log('\n=== MIGRATION COMPLETE ===');
    
    // Verify
    const orgCount = await railwayPool.query('SELECT COUNT(*) as c FROM organizations');
    console.log(`\nRailway DB now has: ${orgCount.rows[0].c} organizations`);

    await localPool.end();
    await railwayPool.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
