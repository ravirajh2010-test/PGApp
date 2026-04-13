const axios = require('axios');

(async () => {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@roomipilot.com',
      password: 'admin123'
    });
    
    const token = loginRes.data.token;
    
    // Get all beds with status
    const bedsRes = await axios.get('http://localhost:5000/api/admin/beds', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Get rooms
    const roomsRes = await axios.get('http://localhost:5000/api/admin/rooms', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const beds = bedsRes.data;
    const rooms = roomsRes.data;
    
    console.log('ðŸ“Š Beds by Room:\n');
    
    const bedsByRoom = {};
    beds.forEach(bed => {
      if (!bedsByRoom[bed.room_id]) {
        bedsByRoom[bed.room_id] = [];
      }
      bedsByRoom[bed.room_id].push(`${bed.bed_identifier}(${bed.status})`);
    });
    
    rooms.forEach(room => {
      const roomBeds = bedsByRoom[room.id] || [];
      const status = roomBeds.length > 0 ? 'âœ…' : 'âŒ';
      console.log(`${status} Room ${room.id}: ${room.building_name} - Room ${room.room_number}`);
      if (roomBeds.length > 0) {
        console.log(`   Beds: ${roomBeds.join(', ')}`);
      } else {
        console.log(`   âš ï¸  No beds created for this room!`);
      }
    });
    
    console.log('\nðŸ’¡ To add beds to a room, go to Property Management > Select Room > Add Beds');
    
  } catch (error) {
    console.error('âŒ Error:', error.message);
  }
})();
