const pool = require('./src/config/database');

async function addColumn() {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN is_first_login BOOLEAN DEFAULT TRUE;');
    console.log('✓ Column is_first_login added successfully');
    process.exit(0);
  } catch (error) {
    if (error.code === '42701') {
      console.log('✓ Column already exists');
      process.exit(0);
    }
    console.error('Error adding column:', error.message);
    process.exit(1);
  }
}

addColumn();
