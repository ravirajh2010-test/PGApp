const pool = require('./src/config/database');

(async () => {
  try {
    const result = await pool.query("SELECT current_database();");
    console.log('Current database:', result.rows[0].current_database);
    
    const users = await pool.query("SELECT email FROM users;");
    console.log('Users in this database:', users.rows.map(u => u.email));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
