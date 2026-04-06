/**
 * Migration script: Add tenant_name, payment_month, payment_year columns to payments table
 * and migrate existing payment records to populate the new columns.
 * 
 * Run: node migratePayments.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const masterConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'hostel_management',
  max: 3
};

async function migrate() {
  const masterPool = new Pool(masterConfig);
  
  try {
    // Get all org databases
    const orgs = await masterPool.query("SELECT id, name, database_name FROM organizations WHERE status = 'active' AND database_name IS NOT NULL");
    console.log(`Found ${orgs.rows.length} organizations to migrate`);

    for (const org of orgs.rows) {
      const dbName = org.database_name;
      if (!dbName) {
        console.log(`  Skipping org ${org.id} (${org.name}) - no database_name`);
        continue;
      }

      console.log(`\nMigrating ${dbName} (${org.name})...`);
      const orgPool = new Pool({ ...masterConfig, database: dbName });

      try {
        // 1. Add new columns if they don't exist
        await orgPool.query(`
          ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_name VARCHAR(255);
          ALTER TABLE payments ADD COLUMN IF NOT EXISTS email VARCHAR(255);
          ALTER TABLE payments ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
          ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_month INTEGER;
          ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_year INTEGER;
        `);
        console.log('  Added columns: tenant_name, email, phone, payment_month, payment_year');

        // 2. Backfill existing records: extract month/year from payment_date (1-based months)
        const updated = await orgPool.query(`
          UPDATE payments
          SET payment_month = EXTRACT(MONTH FROM payment_date)::INTEGER,
              payment_year = EXTRACT(YEAR FROM payment_date)::INTEGER
          WHERE payment_month IS NULL
        `);
        console.log(`  Backfilled month/year for ${updated.rowCount} existing payment records`);

        // 3. Backfill tenant_name from tenants → users join
        const nameUpdated = await orgPool.query(`
          UPDATE payments p
          SET tenant_name = u.name
          FROM tenants t
          JOIN users u ON t.user_id = u.id
          WHERE p.tenant_id = t.id AND p.tenant_name IS NULL
        `);
        console.log(`  Backfilled tenant_name for ${nameUpdated.rowCount} existing payment records`);

        // 4. Backfill email and phone from tenants table
        const emailPhoneUpdated = await orgPool.query(`
          UPDATE payments p
          SET email = t.email, phone = t.phone
          FROM tenants t
          WHERE p.tenant_id = t.id AND p.email IS NULL
        `);
        console.log(`  Backfilled email/phone for ${emailPhoneUpdated.rowCount} existing payment records`);

        // 5. Make payment_month and payment_year NOT NULL (with default for safety)
        await orgPool.query(`
          ALTER TABLE payments ALTER COLUMN payment_month SET NOT NULL;
          ALTER TABLE payments ALTER COLUMN payment_year SET NOT NULL;
        `).catch(err => {
          // May fail if there are still NULL values; that's ok
          console.log(`  Warning: Could not set NOT NULL constraints - ${err.message}`);
        });

        // 5. Add unique constraint if not exists
        await orgPool.query(`
          DO $$ BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'payments_tenant_id_payment_month_payment_year_key'
            ) THEN
              ALTER TABLE payments ADD CONSTRAINT payments_tenant_id_payment_month_payment_year_key
                UNIQUE (tenant_id, payment_month, payment_year);
            END IF;
          END $$;
        `).catch(err => {
          console.log(`  Warning: Could not add unique constraint - ${err.message}`);
        });

        console.log(`  ✓ ${dbName} migrated successfully`);
      } catch (err) {
        console.error(`  ✗ Error migrating ${dbName}:`, err.message);
      } finally {
        await orgPool.end();
      }
    }
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await masterPool.end();
    console.log('\nMigration complete.');
  }
}

migrate();
