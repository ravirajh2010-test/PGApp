const pool = require('./src/config/database');

async function verifyTenantColumns() {
  try {
    console.log('Checking tenants table structure...\n');

    // Get column information
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tenants'
      ORDER BY ordinal_position
    `);

    console.log('📋 Tenants Table Columns:');
    console.table(result.rows);

    // Check if email column exists
    const emailExists = result.rows.some(col => col.column_name === 'email');
    
    if (!emailExists) {
      console.log('\n⚠️  Email column not found. Adding it now...');
      
      await pool.query(`
        ALTER TABLE tenants 
        ADD COLUMN email VARCHAR(255)
      `);
      console.log('✅ Email column added');

      // Populate with existing data
      await pool.query(`
        UPDATE tenants t 
        SET email = u.email 
        FROM users u 
        WHERE t.user_id = u.id
      `);
      console.log('✅ Email populated from users table');

      // Make it non-nullable
      await pool.query(`
        ALTER TABLE tenants 
        ALTER COLUMN email SET NOT NULL
      `);
      console.log('✅ Email set as NOT NULL');
    } else {
      console.log('\n✅ Email column exists!');
    }

    // Verify again
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tenants'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Updated Tenants Table Structure:');
    console.table(verifyResult.rows);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyTenantColumns();
