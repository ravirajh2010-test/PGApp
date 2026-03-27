const pool = require('./src/config/database');

async function checkBuildingsAndRooms() {
  try {
    console.log('Checking buildings and rooms in database...\n');

    const buildingsResult = await pool.query('SELECT * FROM buildings ORDER BY id');
    console.log('📋 Buildings:');
    console.table(buildingsResult.rows);

    const roomsResult = await pool.query(`
      SELECT r.id, r.building_id, r.room_number, r.capacity, b.name as building_name 
      FROM rooms r
      JOIN buildings b ON r.building_id = b.id
      ORDER BY r.building_id, r.room_number
    `);
    console.log('\n📋 Rooms:');
    console.table(roomsResult.rows);

    const bedsResult = await pool.query(`
      SELECT b.id, b.room_id, b.status, r.room_number, bl.name as building_name
      FROM beds b
      JOIN rooms r ON b.room_id = r.id
      JOIN buildings bl ON r.building_id = bl.id
      ORDER BY bl.id, r.room_number
    `);
    console.log('\n📋 Beds:');
    console.table(bedsResult.rows);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkBuildingsAndRooms();
