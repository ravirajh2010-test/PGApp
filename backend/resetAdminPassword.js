const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  try {
    console.log('Resetting admin password to: admin123\n');

    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const result = await pool.query(
      "UPDATE users SET password = $1, is_first_login = FALSE WHERE email = $2 RETURNING id, name, email, role",
      [hashedPassword, 'admin@roomipilot.com']
    );

    if (result.rows.length > 0) {
      console.log('âœ… Admin password updated successfully!\n');
      console.log('ðŸ“‹ Admin User:');
      console.table(result.rows);
      console.log('\nðŸ”‘ Login Credentials:');
      console.log('   Email: admin@roomipilot.com');
      console.log('   Password: admin123');
    } else {
      console.log('âŒ Admin user not found');
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetAdminPassword();
