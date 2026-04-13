-- Database schema for PG Stay - Multi-Tenant SaaS Platform

-- ============================================
-- SaaS Organization (each PG/hostel business)
-- ============================================
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  logo_url VARCHAR(500),
  plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  max_properties INTEGER DEFAULT 1,
  max_beds INTEGER DEFAULT 10,
  max_users INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Subscriptions & Billing
-- ============================================
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  razorpay_subscription_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  razorpay_payment_id VARCHAR(255),
  description TEXT
);

-- ============================================
-- Users (now org-scoped, super_admin is platform-level)
-- ============================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'tenant', 'guest')),
  is_first_login BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email, org_id)
);

-- ============================================
-- Property Management (all org-scoped)
-- ============================================
CREATE TABLE buildings (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  building_id INTEGER REFERENCES buildings(id),
  room_number VARCHAR(50) NOT NULL,
  capacity INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE beds (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  room_id INTEGER REFERENCES rooms(id),
  bed_identifier VARCHAR(50),
  status VARCHAR(50) DEFAULT 'vacant' CHECK (status IN ('occupied', 'vacant')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Tenants (PG residents, org-scoped)
-- ============================================
CREATE TABLE tenants (
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

-- ============================================
-- Payments (org-scoped)
-- ============================================
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
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

-- ============================================
-- Audit Logs
-- ============================================
CREATE TABLE audit_logs (
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

-- ============================================
-- Plan Limits Configuration
-- ============================================
CREATE TABLE plan_limits (
  id SERIAL PRIMARY KEY,
  plan VARCHAR(50) UNIQUE NOT NULL,
  max_properties INTEGER NOT NULL,
  max_beds INTEGER NOT NULL,
  max_users INTEGER NOT NULL,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  features JSONB
);

INSERT INTO plan_limits (plan, max_properties, max_beds, max_users, price_monthly, price_yearly, features) VALUES
  ('free', 1, 10, 5, 0, 0, '{"email_notifications": false, "payment_gateway": false, "reports": false}'),
  ('starter', 3, 50, 20, 5, 50, '{"email_notifications": true, "payment_gateway": true, "reports": false}'),
  ('pro', 10, 200, 100, 15, 150, '{"email_notifications": true, "payment_gateway": true, "reports": true}'),
  ('enterprise', -1, -1, -1, 50, 500, '{"email_notifications": true, "payment_gateway": true, "reports": true, "api_access": true}');

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_buildings_org_id ON buildings(org_id);
CREATE INDEX idx_rooms_org_id ON rooms(org_id);
CREATE INDEX idx_beds_org_id ON beds(org_id);
CREATE INDEX idx_tenants_org_id ON tenants(org_id);
CREATE INDEX idx_payments_org_id ON payments(org_id);
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_subscriptions_org_id ON subscriptions(org_id);
CREATE INDEX idx_invoices_org_id ON invoices(org_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);