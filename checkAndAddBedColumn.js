const pool = require('./backend/src/config/database');

(async () => {
  try {
    const result = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'beds' AND column_name = 'bed_identifier'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ bed_identifier column exists');
    } else {
      console.log('❌ bed_identifier column NOT found');
      console.log('\nAttempting to add it...');
      
      const addResult = await pool.query(`
        ALTER TABLE beds ADD COLUMN bed_identifier VARCHAR(50) DEFAULT NULL
      `);
      console.log('✅ Column added successfully');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
