const pool = require('./src/config/database');

async function checkAdminUser() {
  try {
    console.log('Checking users in hostel_management database...\n');

    const usersResult = await pool.query('SELECT id, name, email, role FROM users ORDER BY id');
    
    console.log('📋 All Users:');
    console.table(usersResult.rows);

    const adminResult = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'admin'");
    
    if (adminResult.rows.length > 0) {
      console.log('\n✅ Admin users found:');
      console.table(adminResult.rows);
      console.log('\nUse these credentials to login:');
      adminResult.rows.forEach(admin => {
        console.log(`  Email: ${admin.email}`);
        console.log(`  (You need the password set for this user)`);
      });
    } else {
      console.log('\n❌ No admin user found!');
      console.log('\nYou need to create an admin user. Run this SQL:');
      console.log(`
INSERT INTO users (name, email, password, role, is_first_login) 
VALUES ('Admin User', 'admin@bajrang.com', '$2a$10$..hashed_password..', 'admin', FALSE);
      `);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAdminUser();
