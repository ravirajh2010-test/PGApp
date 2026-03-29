const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize checkout scheduler in production
if (process.env.NODE_ENV === 'production') {
  try {
    const { scheduleCheckoutJob } = require('./src/services/checkoutScheduler');
    scheduleCheckoutJob();
  } catch (error) {
    console.warn('Warning: Could not initialize checkout scheduler:', error.message);
  }
}

// Routes
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const tenantRoutes = require('./src/routes/tenantRoutes');
const guestRoutes = require('./src/routes/guestRoutes');
const superAdminRoutes = require('./src/routes/superAdminRoutes');
const organizationRoutes = require('./src/routes/organizationRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/organization', organizationRoutes);

const PORT = process.env.PORT || 5000;

// Auto-initialize database tables on startup
const initDatabase = async () => {
  try {
    // Organizations table (SaaS customers)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        logo_url VARCHAR(500),
        plan VARCHAR(50) DEFAULT 'free',
        status VARCHAR(50) DEFAULT 'active',
        max_properties INTEGER DEFAULT 1,
        max_beds INTEGER DEFAULT 10,
        max_users INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Plan limits
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plan_limits (
        id SERIAL PRIMARY KEY,
        plan VARCHAR(50) UNIQUE NOT NULL,
        max_properties INTEGER NOT NULL,
        max_beds INTEGER NOT NULL,
        max_users INTEGER NOT NULL,
        price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
        price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
        features JSONB
      );
    `);

    // Seed plan limits if empty
    const planCheck = await pool.query("SELECT id FROM plan_limits LIMIT 1");
    if (planCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO plan_limits (plan, max_properties, max_beds, max_users, price_monthly, price_yearly, features) VALUES
          ('free', 1, 10, 5, 0, 0, '{"email_notifications": false, "payment_gateway": false, "reports": false}'),
          ('starter', 3, 50, 20, 499, 4990, '{"email_notifications": true, "payment_gateway": true, "reports": false}'),
          ('pro', 10, 200, 100, 1499, 14990, '{"email_notifications": true, "payment_gateway": true, "reports": true}'),
          ('enterprise', -1, -1, -1, 4999, 49990, '{"email_notifications": true, "payment_gateway": true, "reports": true, "api_access": true}')
      `);
      console.log('Plan limits seeded');
    }

    // Subscriptions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        plan VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        billing_cycle VARCHAR(20) DEFAULT 'monthly',
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        razorpay_subscription_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Invoices
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        due_date TIMESTAMP,
        paid_at TIMESTAMP,
        razorpay_payment_id VARCHAR(255),
        description TEXT
      );
    `);

    // Users (with org_id)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        is_first_login BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Buildings (with org_id)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS buildings (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Rooms (with org_id)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        building_id INTEGER REFERENCES buildings(id),
        room_number VARCHAR(50) NOT NULL,
        floor_number INTEGER DEFAULT 1,
        capacity INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Beds (with org_id)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS beds (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        room_id INTEGER REFERENCES rooms(id),
        bed_identifier VARCHAR(50),
        status VARCHAR(50) DEFAULT 'vacant',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tenants (with org_id)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        bed_id INTEGER REFERENCES beds(id),
        start_date DATE NOT NULL,
        end_date DATE,
        rent DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Auto-add phone column if missing (migration)
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Payments (with org_id)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        tenant_id INTEGER REFERENCES tenants(id),
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        razorpay_payment_id VARCHAR(255)
      );
    `);

    // Audit logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        user_id INTEGER,
        action VARCHAR(255) NOT NULL,
        entity_type VARCHAR(100),
        entity_id INTEGER,
        details JSONB,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database tables initialized successfully');

    // Create super admin if none exists
    const superAdminCheck = await pool.query("SELECT id FROM users WHERE role = 'super_admin' LIMIT 1");
    if (superAdminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || 'superadmin123', 10);
      await pool.query(
        "INSERT INTO users (name, email, password, role, is_first_login) VALUES ($1, $2, $3, $4, $5)",
        ['Super Admin', process.env.SUPER_ADMIN_EMAIL || 'superadmin@pgstay.com', hashedPassword, 'super_admin', false]
      );
      console.log('Default super admin created (superadmin@pgstay.com / superadmin123)');
    }

    // Create default demo organization if none exists
    const orgCheck = await pool.query("SELECT id FROM organizations LIMIT 1");
    if (orgCheck.rows.length === 0) {
      // Create demo org
      const orgResult = await pool.query(
        "INSERT INTO organizations (name, slug, email, plan, status, max_properties, max_beds, max_users) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
        ['Bajrang Hostels', 'bajrang-hostels', 'admin@pgstay.com', 'pro', 'active', 10, 200, 100]
      );
      const orgId = orgResult.rows[0].id;

      // Create subscription for demo org
      await pool.query(
        "INSERT INTO subscriptions (org_id, plan, amount, billing_cycle, current_period_start, current_period_end) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 month')",
        [orgId, 'pro', 1499, 'monthly']
      );

      // Create admin user for this org
      const adminPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        "INSERT INTO users (name, email, password, role, org_id, is_first_login) VALUES ($1, $2, $3, $4, $5, $6)",
        ['Admin', 'admin@pgstay.com', adminPassword, 'admin', orgId, false]
      );

      // Seed buildings
      await pool.query("INSERT INTO buildings (id, name, location, org_id) VALUES (1, 'Main Building', 'Chennai', $1), (2, 'AddBuilding', 'Chennai', $1)", [orgId]);
      await pool.query("SELECT setval('buildings_id_seq', (SELECT MAX(id) FROM buildings))");

      // Seed rooms with floor numbers (auto-calculated from room number: 0xx=Ground, 1xx=1st, 2xx=2nd, 3xx=3rd)
      await pool.query(`
        INSERT INTO rooms (id, building_id, room_number, floor_number, capacity, org_id) VALUES
        (1, 1, '001', 0, 3, $1), (2, 1, '101', 1, 3, $1), (3, 1, '201', 2, 2, $1), 
        (4, 2, '002', 0, 3, $1), (5, 2, '102', 1, 3, $1), (6, 2, '202', 2, 3, $1)
      `, [orgId]);
      await pool.query("SELECT setval('rooms_id_seq', (SELECT MAX(id) FROM rooms))");

      // Seed beds
      const roomsResult = await pool.query("SELECT id, capacity FROM rooms ORDER BY id");
      const bedLabels = ['A', 'B', 'C', 'D', 'E'];
      for (const room of roomsResult.rows) {
        for (let i = 0; i < room.capacity; i++) {
          await pool.query(
            "INSERT INTO beds (room_id, bed_identifier, status, org_id) VALUES ($1, $2, 'vacant', $3)",
            [room.id, bedLabels[i], orgId]
          );
        }
      }

      console.log('Demo organization "Bajrang Hostels" created with seed data');
      console.log('Admin login: admin@pgstay.com / admin123 (org: bajrang-hostels)');
    }
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
};

initDatabase();

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));