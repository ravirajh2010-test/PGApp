#!/bin/bash
# Database initialization script for Render deployment
# This script runs on backend startup to ensure database schema exists

echo "[INIT] Starting database initialization..."

# Create initialization JS file
cat > /tmp/init-db.js << 'EOF'
const fs = require('fs');
const path = require('path');
const pool = require('./src/config/database');

async function initDatabase() {
  try {
    console.log('[DB INIT] Connecting to database...');
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('[DB INIT] ✅ Database connection successful');
    
    // Read schema file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.log('[DB INIT] ⚠️  Schema file not found. Skipping initialization.');
      return true;
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    console.log(`[DB INIT] Executing ${statements.length} schema statements...`);
    
    for (const statement of statements) {
      try {
        await pool.query(statement);
      } catch (err) {
        // Ignore "already exists" errors
        if (!err.message.includes('already exists')) {
          console.error('[DB INIT] Error executing statement:', err.message);
          throw err;
        }
      }
    }
    
    console.log('[DB INIT] ✅ Database schema initialized successfully');
    
    // Check if admin user exists
    const adminCheck = await pool.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin' LIMIT 1"
    );
    
    if (adminCheck.rows[0].count === 0) {
      console.log('[DB INIT] ⚠️  No admin user found. Please create one via admin panel.');
    } else {
      console.log('[DB INIT] ✅ Admin user exists');
    }
    
    await pool.end();
    return true;
  } catch (error) {
    console.error('[DB INIT] ❌ Database initialization error:', error.message);
    return false;
  }
}

initDatabase().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('[DB INIT] Fatal error:', err);
  process.exit(1);
});
EOF

# Run initialization
cd backend
node /tmp/init-db.js
INIT_RESULT=$?

if [ $INIT_RESULT -eq 0 ]; then
  echo "[INIT] ✅ Database initialization completed"
else
  echo "[INIT] ⚠️  Database initialization encountered warnings, continuing startup..."
fi

# Start the server
npm start
