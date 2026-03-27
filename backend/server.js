const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Razorpay = require('razorpay');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize Razorpay only if keys are provided
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// Initialize checkout scheduler in production
if (process.env.NODE_ENV === 'production') {
  try {
    const { scheduleCheckoutJob } = require('./src/services/checkoutScheduler');
    scheduleCheckoutJob();
  } catch (error) {
    console.warn('Warning: Could not initialize checkout scheduler:', error.message);
  }
}

// Middleware for authentication
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

const authorizeRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
  next();
};

// Routes will be added here
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const tenantRoutes = require('./src/routes/tenantRoutes');
const guestRoutes = require('./src/routes/guestRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/guest', guestRoutes);

const PORT = process.env.PORT || 5000;

// Auto-initialize database tables on startup
const initDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'tenant', 'guest')),
        is_first_login BOOLEAN DEFAULT TRUE
      );
      CREATE TABLE IF NOT EXISTS buildings (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255)
      );
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        building_id INTEGER REFERENCES buildings(id),
        room_number VARCHAR(50) NOT NULL,
        capacity INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS beds (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES rooms(id),
        bed_identifier VARCHAR(50),
        status VARCHAR(50) DEFAULT 'vacant' CHECK (status IN ('occupied', 'vacant'))
      );
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        email VARCHAR(255) NOT NULL,
        bed_id INTEGER REFERENCES beds(id),
        start_date DATE NOT NULL,
        end_date DATE,
        rent DECIMAL(10,2) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER REFERENCES tenants(id),
        amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        razorpay_payment_id VARCHAR(255)
      );
    `);
    console.log('Database tables initialized successfully');

    // Create default admin user if none exists
    const bcrypt = require('bcryptjs');
    const adminCheck = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        "INSERT INTO users (name, email, password, role, is_first_login) VALUES ($1, $2, $3, $4, $5)",
        ['Admin', 'admin@pgstay.com', hashedPassword, 'admin', false]
      );
      console.log('Default admin user created (admin@pgstay.com / admin123)');
    }

    // Seed buildings, rooms, and beds if empty
    const buildingCheck = await pool.query("SELECT id FROM buildings LIMIT 1");
    if (buildingCheck.rows.length === 0) {
      console.log('Seeding buildings, rooms, and beds...');

      // Buildings
      await pool.query("INSERT INTO buildings (id, name, location) VALUES (1, 'Main Building', 'Chennai'), (2, 'AddBuilding', 'Chennai')");
      await pool.query("SELECT setval('buildings_id_seq', (SELECT MAX(id) FROM buildings))");

      // Rooms
      await pool.query(`
        INSERT INTO rooms (id, building_id, room_number, capacity) VALUES
        (1, 1, '101', 3), (2, 1, '201', 2), (3, 1, '301', 3),
        (4, 2, '101', 3), (5, 2, '102', 3), (6, 2, '201', 2)
      `);
      await pool.query("SELECT setval('rooms_id_seq', (SELECT MAX(id) FROM rooms))");

      // Beds (3 per room based on capacity)
      const roomsResult = await pool.query("SELECT id, capacity FROM rooms ORDER BY id");
      const bedLabels = ['A', 'B', 'C', 'D', 'E'];
      for (const room of roomsResult.rows) {
        for (let i = 0; i < room.capacity; i++) {
          await pool.query(
            "INSERT INTO beds (room_id, bed_identifier, status) VALUES ($1, $2, 'vacant')",
            [room.id, bedLabels[i]]
          );
        }
      }

      console.log('Seed data inserted successfully');
    }
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
};

initDatabase();

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));