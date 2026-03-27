const axios = require('axios');

(async () => {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@pgstay.com',
      password: 'admin123'
    });
    
    const token = loginRes.data.token;
    
    // Get all beds
    const bedsRes = await axios.get('http://localhost:5000/api/admin/beds', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const beds = bedsRes.data;
    
    // Find bed D in Room 101
    const bedD = beds.find(b => b.room_id === 1 && b.bed_identifier === 'D');
    
    if (bedD) {
      console.log(`Deleting bed D (ID: ${bedD.id}) from Room 101...`);
      
      await axios.delete(`http://localhost:5000/api/admin/beds/${bedD.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Bed D deleted successfully!\n');
    }
    
    // Verify
    const bedsRes2 = await axios.get('http://localhost:5000/api/admin/beds', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const room101Beds = bedsRes2.data.filter(bed => bed.room_id === 1);
    console.log(`📋 Room 101 beds after cleanup: ${room101Beds.length}/3`);
    console.log(`Beds: ${room101Beds.map(b => b.bed_identifier).join(', ')}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
