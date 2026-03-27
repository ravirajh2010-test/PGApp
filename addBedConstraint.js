const pool = require('./backend/src/config/database');

(async () => {
  try {
    await pool.query(`
      ALTER TABLE beds ADD CONSTRAINT unique_bed_per_room UNIQUE (room_id, bed_identifier)
    `);
    console.log('✅ Unique constraint added');
    process.exit(0);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️ Constraint already exists');
      process.exit(0);
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
})();
