const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize DatabaseManager and master pool
const dbManager = require('./src/services/DatabaseManager');
const pool = dbManager.initMasterPool();

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
const debugEmailRoutes = require('./src/routes/debugEmailRoutes');

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/debug/email', debugEmailRoutes);

const PORT = process.env.PORT || 5000;

// Auto-initialize database tables on startup (runs in background, doesn't block server)
const initDatabase = async () => {
  try {
    // --- Master DB tables (minimal initialization, no org pool warmup ---

    // Organizations table (with database_name column for per-org DB)
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
        database_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add database_name column if missing (migration for existing installs)
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE organizations ADD COLUMN IF NOT EXISTS database_name VARCHAR(255);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
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

    // Users table in master DB (for super_admin only)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        is_first_login BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // User-org mapping table (for cross-org login resolution)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_org_map (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(email, org_id)
      );
    `);

    await pool.query('CREATE INDEX IF NOT EXISTS idx_user_org_map_email ON user_org_map(email)');

    console.log('Master database tables initialized successfully');

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

    // Check for existing orgs
    const orgCheck = await pool.query("SELECT id, database_name FROM organizations LIMIT 1");
    if (orgCheck.rows.length === 0) {
      console.log('NOTE: No organizations found. Create one via the registration page.');
    } else if (!orgCheck.rows[0].database_name) {
      console.log('NOTE: Existing organizations found without per-org databases.');
      console.log('Run the migration script: node backend/scripts/migrate-to-per-org-db.js');
    }
    
    console.log('Database initialization complete');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
};

// Start server immediately, initialize DB in background
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

// Initialize database tables asynchronously (don't block server startup)
initDatabase().then(async () => {
  // In single-DB mode, initialize org schemas after master tables are ready
  await dbManager.initAllOrgSchemas();
}).catch(error => {
  console.error('Background database initialization failed:', error.message);
});