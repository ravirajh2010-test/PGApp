const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  try {
    console.log('Resetting admin password to: admin123\n');

    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const result = await pool.query(
      "UPDATE users SET password = $1, is_first_login = FALSE WHERE email = $2 RETURNING id, name, email, role",
      [hashedPassword, 'admin@pgstay.com']
    );

    if (result.rows.length > 0) {
      console.log('✅ Admin password updated successfully!\n');
      console.log('📋 Admin User:');
      console.table(result.rows);
      console.log('\n🔑 Login Credentials:');
      console.log('   Email: admin@pgstay.com');
      console.log('   Password: admin123');
    } else {
      console.log('❌ Admin user not found');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetAdminPassword();
