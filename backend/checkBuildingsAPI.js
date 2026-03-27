const pool = require('./src/config/database');

async function checkBuildingsAPI() {
  try {
    console.log('Checking buildings in database...\n');

    const result = await pool.query('SELECT * FROM buildings ORDER BY id');
    
    console.log('📋 Buildings in Database:');
    console.table(result.rows);

    console.log('\n✅ API endpoint /guest/buildings should return the above data');
    console.log('\nIf the frontend is showing different data, restart the backend server:');
    console.log('  1. Stop the backend (Ctrl+C)');
    console.log('  2. Run: npm run dev');
    console.log('  3. Refresh the browser');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkBuildingsAPI();
