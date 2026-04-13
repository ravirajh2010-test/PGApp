const pool = require('./src/config/database');
const fs = require('fs');
const path = require('path');

const initDatabase = async () => {
  try {
    console.log('Initializing database...');
    
    // Test connection first
    await pool.query('SELECT NOW()');
    console.log('âœ… Connected to PostgreSQL');
    
    const schema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      try {
        await pool.query(statement);
      } catch (err) {
        // Ignore "already exists" errors
        if (!err.message.includes('already exists')) {
          throw err;
        }
      }
    }
    
    console.log('âœ… Database tables created successfully!');
    
    // Insert sample data
    await insertSampleData();
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('âŒ Database initialization error:', error.message);
    process.exit(1);
  }
};

const insertSampleData = async () => {
  try {
    console.log('Inserting sample data...');
    
    // Check if data already exists
    const result = await pool.query('SELECT COUNT(*) FROM buildings');
    if (result.rows[0].count > 0) {
      console.log('Sample data already exists.');
      return;
    }
    
    // Insert buildings
    await pool.query("INSERT INTO buildings (name, location) VALUES ('Sunrise Building', 'Downtown')");
    await pool.query("INSERT INTO buildings (name, location) VALUES ('Sunset Towers', 'Midtown')");
    
    // Insert rooms
    await pool.query("INSERT INTO rooms (building_id, room_number, capacity) VALUES (1, '101', 2)");
    await pool.query("INSERT INTO rooms (building_id, room_number, capacity) VALUES (1, '102', 2)");
    await pool.query("INSERT INTO rooms (building_id, room_number, capacity) VALUES (2, '201', 3)");
    
    // Insert beds
    await pool.query("INSERT INTO beds (room_id, status) VALUES (1, 'vacant')");
    await pool.query("INSERT INTO beds (room_id, status) VALUES (1, 'vacant')");
    await pool.query("INSERT INTO beds (room_id, status) VALUES (2, 'vacant')");
    await pool.query("INSERT INTO beds (room_id, status) VALUES (2, 'occupied')");
    await pool.query("INSERT INTO beds (room_id, status) VALUES (3, 'vacant')");
    
    // Insert admin user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
      ['Admin User', 'admin@roomipilot.com', hashedPassword, 'admin']
    );
    
    console.log('âœ… Sample data inserted successfully!');
  } catch (error) {
    console.error('Error inserting sample data:', error.message);
  }
};

initDatabase();