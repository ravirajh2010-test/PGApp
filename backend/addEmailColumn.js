const pool = require('./src/config/database');

async function addEmailColumn() {
  try {
    console.log('Adding email column to tenants table...\n');

    // Check if column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' AND column_name = 'email'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Email column already exists in tenants table');
      await pool.end();
      process.exit(0);
    }

    // Add email column to tenants table
    await pool.query(`
      ALTER TABLE tenants 
      ADD COLUMN email VARCHAR(255)
    `);
    console.log('✅ Email column added to tenants table');

    // Populate email from users table
    await pool.query(`
      UPDATE tenants t 
      SET email = u.email 
      FROM users u 
      WHERE t.user_id = u.id
    `);
    console.log('✅ Email values populated from users table');

    // Make it non-nullable
    await pool.query(`
      ALTER TABLE tenants 
      ALTER COLUMN email SET NOT NULL
    `);
    console.log('✅ Email column set as NOT NULL');

    // Verify the changes
    const verifyResult = await pool.query(`
      SELECT id, user_id, email, rent FROM tenants LIMIT 5
    `);
    console.log('\n📋 Sample data with email:');
    console.table(verifyResult.rows);

    await pool.end();
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addEmailColumn();
