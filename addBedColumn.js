const pool = require('./backend/src/config/database');

(async () => {
  try {
    const result = await pool.query(`
      ALTER TABLE beds ADD COLUMN bed_identifier VARCHAR(50) DEFAULT NULL
    `);
    console.log('✅ Column added successfully');
    process.exit(0);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️ Column already exists');
      process.exit(0);
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
})();
