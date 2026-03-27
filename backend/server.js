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
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));