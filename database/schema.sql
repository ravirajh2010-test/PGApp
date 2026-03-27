-- Database schema for Bajrang Hostels and PG Pvt Ltd

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'tenant', 'guest')),
  is_first_login BOOLEAN DEFAULT TRUE
);

CREATE TABLE buildings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255)
);

CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  building_id INTEGER REFERENCES buildings(id),
  room_number VARCHAR(50) NOT NULL,
  capacity INTEGER NOT NULL
);

CREATE TABLE beds (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id),
  bed_identifier VARCHAR(50),
  status VARCHAR(50) DEFAULT 'vacant' CHECK (status IN ('occupied', 'vacant'))
);

CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  email VARCHAR(255) NOT NULL,
  bed_id INTEGER REFERENCES beds(id),
  start_date DATE NOT NULL,
  end_date DATE,
  rent DECIMAL(10,2) NOT NULL
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER REFERENCES tenants(id),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  razorpay_payment_id VARCHAR(255)
);