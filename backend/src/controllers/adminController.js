const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Bed = require('../models/Bed');
const { sendTenantCredentials } = require('../services/emailService');
const pool = require('../config/database');

const getTenants = async (req, res) => {
  try {
    const tenants = await Tenant.findAll();
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createTenant = async (req, res) => {
  try {
    const { name, email, password, bedId, startDate, endDate, rent } = req.body;
    
    // Validate input
    if (!name || !email || !password || !bedId || !rent) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'Already this mail id is used' });
    }

    // Create user
    const user = await User.create(name, email, password, 'tenant');
    
    // Create tenant with email
    const tenant = await Tenant.create(user.id, email, bedId, startDate, endDate, rent);
    
    // Update bed status
    await Bed.updateStatus(bedId, 'occupied');
    
    // Fetch bed information for email
    const bedQuery = `
      SELECT b.id, r.room_number, bl.name as building_name 
      FROM beds b 
      JOIN rooms r ON b.room_id = r.id 
      JOIN buildings bl ON r.building_id = bl.id 
      WHERE b.id = $1
    `;
    const bedResult = await pool.query(bedQuery, [bedId]);
    const bedInfo = bedResult.rows[0] 
      ? `${bedResult.rows[0].building_name} - Room ${bedResult.rows[0].room_number}`
      : 'Bed assigned';
    
    // Send email with credentials
    await sendTenantCredentials(email, name, password, bedInfo);
    
    res.status(201).json({ 
      message: 'Tenant created successfully and credentials sent to email',
      tenant: { 
        id: tenant.id, 
        name, 
        email, 
        bedId, 
        startDate, 
        endDate, 
        rent 
      },
      credentials: { email, password }
    });
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const tenant = await Tenant.update(id, updates);
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findById(id);
    
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Delete associated payments first (to avoid foreign key constraint)
    await pool.query('DELETE FROM payments WHERE tenant_id = $1', [id]);
    console.log(`✅ Deleted payments for tenant ${id}`);

    // Update bed status to vacant
    if (tenant.bed_id) {
      await Bed.updateStatus(tenant.bed_id, 'vacant');
      console.log(`✅ Marked bed ${tenant.bed_id} as vacant`);
    }

    // Delete the tenant record
    await Tenant.delete(id);
    console.log(`✅ Deleted tenant record ${id}`);

    // Delete the associated user record
    await pool.query('DELETE FROM users WHERE id = $1', [tenant.user_id]);
    console.log(`✅ Deleted user ID ${tenant.user_id}`);

    res.json({ message: 'Tenant and associated records deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
const processCheckouts = async (req, res) => {
  try {
    const { processTenantCheckouts } = require('../services/tenantCheckoutService');
    const result = await processTenantCheckouts();
    
    if (result.success) {
      res.json({ 
        message: result.message,
        checkouts: result.checkouts,
        results: result.results || []
      });
    } else {
      res.status(500).json({ 
        message: 'Error processing checkouts',
        error: result.error,
        checkouts: result.checkouts
      });
    }
  } catch (error) {
    console.error('Error in processCheckouts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
const getOccupancy = async (req, res) => {
  try {
    const query = 'SELECT COUNT(*) as occupied FROM beds WHERE status = $1';
    const result = await require('../config/database').query(query, ['occupied']);
    const totalQuery = 'SELECT COUNT(*) as total FROM beds';
    const totalResult = await require('../config/database').query(totalQuery);
    res.json({ occupied: result.rows[0].occupied, total: totalResult.rows[0].total });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getAvailableBeds = async (req, res) => {
  try {
    const query = 'SELECT b.id, b.room_id, b.bed_identifier, b.status, r.room_number, r.building_id, bl.name as building_name FROM beds b JOIN rooms r ON b.room_id = r.id JOIN buildings bl ON r.building_id = bl.id WHERE b.status = $1 ORDER BY bl.name, r.room_number, b.bed_identifier';
    const result = await require('../config/database').query(query, ['vacant']);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getBuildings = async (req, res) => {
  try {
    const Building = require('../models/Building');
    const buildings = await Building.findAll();
    res.json(buildings);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createBuilding = async (req, res) => {
  try {
    const { name, location } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Building name is required' });
    }
    
    const Building = require('../models/Building');
    const building = await Building.create(name, location);
    res.status(201).json(building);
  } catch (error) {
    console.error('Error creating building:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateBuilding = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Building name is required' });
    }
    
    const Building = require('../models/Building');
    const building = await Building.update(id, name, location);
    res.json(building);
  } catch (error) {
    console.error('Error updating building:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteBuilding = async (req, res) => {
  try {
    const { id } = req.params;
    const Building = require('../models/Building');
    const building = await Building.delete(id);
    res.json({ message: 'Building deleted successfully', building });
  } catch (error) {
    console.error('Error deleting building:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRooms = async (req, res) => {
  try {
    const query = 'SELECT r.id, r.room_number, r.building_id, r.capacity, bl.name as building_name FROM rooms r JOIN buildings bl ON r.building_id = bl.id ORDER BY bl.name, r.room_number';
    const result = await require('../config/database').query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createRoom = async (req, res) => {
  try {
    const { buildingId, roomNumber, capacity } = req.body;
    console.log('createRoom params:', { buildingId, roomNumber, capacity });
    
    if (!buildingId || !roomNumber || !capacity) {
      return res.status(400).json({ message: 'Building, room number, and capacity are required' });
    }
    
    const Room = require('../models/Room');
    const room = await Room.create(buildingId, roomNumber, capacity);
    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error.message, error.detail);
    res.status(500).json({ message: 'Server error', error: error.message })
  }
};

const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { buildingId, roomNumber, capacity } = req.body;
    if (!buildingId || !roomNumber || !capacity) {
      return res.status(400).json({ message: 'Building, room number, and capacity are required' });
    }
    
    const Room = require('../models/Room');
    const room = await Room.update(id, buildingId, roomNumber, capacity);
    res.json(room);
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const Room = require('../models/Room');
    const room = await Room.delete(id);
    res.json({ message: 'Room deleted successfully', room });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBeds = async (req, res) => {
  try {
    const query = 'SELECT b.id, b.room_id, b.bed_identifier, b.status, r.room_number, r.building_id, r.capacity, bl.name as building_name FROM beds b JOIN rooms r ON b.room_id = r.id JOIN buildings bl ON r.building_id = bl.id ORDER BY bl.name, r.room_number, b.id';
    const result = await require('../config/database').query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching beds:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createBed = async (req, res) => {
  try {
    const { roomId, bedIdentifier, status } = req.body;
    if (!roomId || !bedIdentifier) {
      return res.status(400).json({ message: 'Room and bed identifier are required' });
    }
    
    const pool = require('../config/database');
    
    // Get room capacity
    const roomResult = await pool.query('SELECT capacity FROM rooms WHERE id = $1', [roomId]);
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }
    const roomCapacity = roomResult.rows[0].capacity;
    
    // Count existing beds in this room
    const bedCountResult = await pool.query('SELECT COUNT(*) as count FROM beds WHERE room_id = $1', [roomId]);
    const existingBedCount = parseInt(bedCountResult.rows[0].count);
    
    // Check if adding a new bed would exceed capacity
    if (existingBedCount >= roomCapacity) {
      return res.status(400).json({ 
        message: `Cannot add more beds. Room capacity is ${roomCapacity} but already has ${existingBedCount} beds` 
      });
    }
    
    // Check if a bed with this identifier already exists in this room
    const existingBed = await pool.query(
      'SELECT id FROM beds WHERE room_id = $1 AND bed_identifier = $2',
      [roomId, bedIdentifier]
    );
    
    if (existingBed.rows.length > 0) {
      return res.status(400).json({ message: 'A bed with this identifier already exists in this room' });
    }
    
    const Bed = require('../models/Bed');
    const bed = await Bed.create(roomId, bedIdentifier, status || 'vacant');
    res.status(201).json(bed);
  } catch (error) {
    console.error('Error creating bed:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateBed = async (req, res) => {
  try {
    const { id } = req.params;
    const { roomId, bedIdentifier, status } = req.body;
    if (!roomId || !bedIdentifier || !status) {
      return res.status(400).json({ message: 'Room, bed identifier, and status are required' });
    }
    
    const pool = require('../config/database');
    
    // Get current bed's room
    const currentBedResult = await pool.query('SELECT room_id FROM beds WHERE id = $1', [id]);
    if (currentBedResult.rows.length === 0) {
      return res.status(404).json({ message: 'Bed not found' });
    }
    const currentRoomId = currentBedResult.rows[0].room_id;
    
    // If moving to a different room, check capacity
    if (parseInt(roomId) !== currentRoomId) {
      const roomResult = await pool.query('SELECT capacity FROM rooms WHERE id = $1', [roomId]);
      if (roomResult.rows.length === 0) {
        return res.status(404).json({ message: 'Target room not found' });
      }
      const roomCapacity = roomResult.rows[0].capacity;
      
      // Count existing beds in the target room
      const bedCountResult = await pool.query('SELECT COUNT(*) as count FROM beds WHERE room_id = $1', [roomId]);
      const existingBedCount = parseInt(bedCountResult.rows[0].count);
      
      // Check if moving this bed would exceed capacity
      if (existingBedCount >= roomCapacity) {
        return res.status(400).json({ 
          message: `Cannot move bed. Target room capacity is ${roomCapacity} but already has ${existingBedCount} beds` 
        });
      }
    }
    
    // Check if bed identifier already exists in target room (excluding current bed)
    const existingBed = await pool.query(
      'SELECT id FROM beds WHERE room_id = $1 AND bed_identifier = $2 AND id != $3',
      [roomId, bedIdentifier, id]
    );
    
    if (existingBed.rows.length > 0) {
      return res.status(400).json({ message: 'A bed with this identifier already exists in the target room' });
    }
    
    const Bed = require('../models/Bed');
    const bed = await Bed.update(id, roomId, bedIdentifier, status);
    res.json(bed);
  } catch (error) {
    console.error('Error updating bed:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteBed = async (req, res) => {
  try {
    const { id } = req.params;
    const Bed = require('../models/Bed');
    const bed = await Bed.delete(id);
    res.json({ message: 'Bed deleted successfully', bed });
  } catch (error) {
    console.error('Error deleting bed:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getTenants, createTenant, updateTenant, deleteTenant, processCheckouts, getOccupancy, getAvailableBeds, getBuildings, createBuilding, updateBuilding, deleteBuilding, getRooms, createRoom, updateRoom, deleteRoom, getBeds, createBed, updateBed, deleteBed };