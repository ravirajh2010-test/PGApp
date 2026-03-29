const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Bed = require('../models/Bed');
const { sendTenantCredentials, sendPaymentReminder, sendRentReceipt } = require('../services/emailService');
const pool = require('../config/database');

const getTenants = async (req, res) => {
  try {
    const tenants = await Tenant.findAll(req.orgId);
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createTenant = async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, email, password, bedId, startDate, endDate, rent, phone } = req.body;
    
    if (!name || !email || !password || !bedId || !rent) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    console.log(`📝 Creating tenant: ${name} (${email}) for org ${req.orgId}`);

    // Start transaction
    await client.query('BEGIN');

    const existingUser = await client.query('SELECT * FROM users WHERE email = $1 AND org_id = $2', [email, req.orgId]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Already this mail id is used' });
    }

    // Verify bed exists and belongs to this org
    const bedCheck = await client.query('SELECT id FROM beds WHERE id = $1 AND org_id = $2', [bedId, req.orgId]);
    if (bedCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Bed not found or does not belong to your organization' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await client.query(
      'INSERT INTO users (name, email, password, role, org_id, is_first_login) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *',
      [name, email, hashedPassword, 'tenant', req.orgId]
    );
    const user = userResult.rows[0];
    console.log(`✓ User created: ID ${user.id}`);

    // Create tenant
    const tenantResult = await client.query(
      'INSERT INTO tenants (user_id, email, bed_id, start_date, end_date, rent, org_id, phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [user.id, email, bedId, startDate, endDate || null, rent, req.orgId, phone || null]
    );
    const tenant = tenantResult.rows[0];
    console.log(`✓ Tenant created: ID ${tenant.id}`);

    // Update bed status
    await client.query(
      'UPDATE beds SET status = $1 WHERE id = $2 AND org_id = $3',
      ['occupied', bedId, req.orgId]
    );
    console.log(`✓ Bed ${bedId} marked as occupied`);

    // Commit transaction
    await client.query('COMMIT');
    console.log(`✅ Tenant ${tenant.id} fully created and committed`);

    // Get bed info for email (using main pool after transaction)
    const bedQuery = `
      SELECT b.id, r.room_number, bl.name as building_name 
      FROM beds b 
      JOIN rooms r ON b.room_id = r.id 
      JOIN buildings bl ON r.building_id = bl.id 
      WHERE b.id = $1 AND b.org_id = $2
    `;
    const bedResult = await pool.query(bedQuery, [bedId, req.orgId]);
    const bedInfo = bedResult.rows[0] 
      ? `${bedResult.rows[0].building_name} - Room ${bedResult.rows[0].room_number}`
      : 'Bed assigned';
    
    const emailSent = await sendTenantCredentials(email, name, password, bedInfo);
    
    res.status(201).json({ 
      message: emailSent 
        ? 'Tenant created successfully and credentials sent to email'
        : 'Tenant created successfully but email could not be sent. Please share credentials manually.',
      emailSent,
      tenant: { id: tenant.id, name, email, bedId, startDate, endDate, rent },
      credentials: { email, password }
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(e => console.error('Rollback error:', e));
    console.error('❌ Error creating tenant:', error.message, error.detail);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    client.release();
  }
};

const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const tenant = await Tenant.update(id, updates, req.orgId);
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findById(id, req.orgId);
    
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    await pool.query('DELETE FROM payments WHERE tenant_id = $1', [id]);

    if (tenant.bed_id) {
      await Bed.updateStatus(tenant.bed_id, 'vacant');
    }

    await Tenant.delete(id, req.orgId);
    await pool.query("DELETE FROM users WHERE id = $1 AND role = 'tenant'", [tenant.user_id]);

    res.json({ message: 'Tenant and associated records deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const processCheckouts = async (req, res) => {
  try {
    const { processTenantCheckouts } = require('../services/tenantCheckoutService');
    const result = await processTenantCheckouts(req.orgId);
    
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
    const result = await pool.query("SELECT COUNT(*) as occupied FROM beds WHERE status = 'occupied' AND org_id = $1", [req.orgId]);
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM beds WHERE org_id = $1', [req.orgId]);
    res.json({ occupied: result.rows[0].occupied, total: totalResult.rows[0].total });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getAvailableBeds = async (req, res) => {
  try {
    const query = `SELECT b.id, b.room_id, b.bed_identifier, b.status, r.room_number, r.building_id, bl.name as building_name 
      FROM beds b JOIN rooms r ON b.room_id = r.id JOIN buildings bl ON r.building_id = bl.id 
      WHERE b.status = 'vacant' AND b.org_id = $1 
      ORDER BY bl.name, r.room_number, b.bed_identifier`;
    const result = await pool.query(query, [req.orgId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getFloorLayout = async (req, res) => {
  try {
    const { buildingId } = req.query;
    if (!buildingId) {
      return res.status(400).json({ message: 'buildingId is required' });
    }
    
    const Room = require('../models/Room');
    const floors = await Room.getFloorLayout(buildingId, req.orgId);
    res.json(floors);
  } catch (error) {
    console.error('Error fetching floor layout:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBuildings = async (req, res) => {
  try {
    const Building = require('../models/Building');
    const buildings = await Building.findAll(req.orgId);
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
    const building = await Building.create(name, location, req.orgId);
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
    const building = await Building.update(id, name, location, req.orgId);
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
    const building = await Building.delete(id, req.orgId);
    res.json({ message: 'Building deleted successfully', building });
  } catch (error) {
    console.error('Error deleting building:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getRooms = async (req, res) => {
  try {
    const query = `SELECT r.id, r.room_number, r.building_id, r.capacity, bl.name as building_name 
      FROM rooms r JOIN buildings bl ON r.building_id = bl.id 
      WHERE r.org_id = $1 
      ORDER BY bl.name, r.room_number`;
    const result = await pool.query(query, [req.orgId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createRoom = async (req, res) => {
  try {
    const { buildingId, roomNumber, capacity } = req.body;
    
    if (!buildingId || !roomNumber || !capacity) {
      return res.status(400).json({ message: 'Building, room number, and capacity are required' });
    }
    
    const Room = require('../models/Room');
    const room = await Room.create(buildingId, roomNumber, capacity, req.orgId);
    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error.message, error.detail);
    res.status(500).json({ message: 'Server error', error: error.message });
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
    const room = await Room.update(id, buildingId, roomNumber, capacity, req.orgId);
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
    const room = await Room.delete(id, req.orgId);
    res.json({ message: 'Room deleted successfully', room });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBeds = async (req, res) => {
  try {
    const query = `SELECT b.id, b.room_id, b.bed_identifier, b.status, r.room_number, r.building_id, r.capacity, bl.name as building_name 
      FROM beds b JOIN rooms r ON b.room_id = r.id JOIN buildings bl ON r.building_id = bl.id 
      WHERE b.org_id = $1 
      ORDER BY bl.name, r.room_number, b.id`;
    const result = await pool.query(query, [req.orgId]);
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
    
    const roomResult = await pool.query('SELECT capacity FROM rooms WHERE id = $1 AND org_id = $2', [roomId, req.orgId]);
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }
    const roomCapacity = roomResult.rows[0].capacity;
    
    const bedCountResult = await pool.query('SELECT COUNT(*) as count FROM beds WHERE room_id = $1 AND org_id = $2', [roomId, req.orgId]);
    const existingBedCount = parseInt(bedCountResult.rows[0].count);
    
    if (existingBedCount >= roomCapacity) {
      return res.status(400).json({ 
        message: `Cannot add more beds. Room capacity is ${roomCapacity} but already has ${existingBedCount} beds` 
      });
    }
    
    const existingBed = await pool.query(
      'SELECT id FROM beds WHERE room_id = $1 AND bed_identifier = $2 AND org_id = $3',
      [roomId, bedIdentifier, req.orgId]
    );
    
    if (existingBed.rows.length > 0) {
      return res.status(400).json({ message: 'A bed with this identifier already exists in this room' });
    }
    
    const BedModel = require('../models/Bed');
    const bed = await BedModel.create(roomId, bedIdentifier, status || 'vacant', req.orgId);
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
    
    const currentBedResult = await pool.query('SELECT room_id FROM beds WHERE id = $1 AND org_id = $2', [id, req.orgId]);
    if (currentBedResult.rows.length === 0) {
      return res.status(404).json({ message: 'Bed not found' });
    }
    const currentRoomId = currentBedResult.rows[0].room_id;
    
    if (parseInt(roomId) !== currentRoomId) {
      const roomResult = await pool.query('SELECT capacity FROM rooms WHERE id = $1 AND org_id = $2', [roomId, req.orgId]);
      if (roomResult.rows.length === 0) {
        return res.status(404).json({ message: 'Target room not found' });
      }
      const roomCapacity = roomResult.rows[0].capacity;
      
      const bedCountResult = await pool.query('SELECT COUNT(*) as count FROM beds WHERE room_id = $1 AND org_id = $2', [roomId, req.orgId]);
      const existingBedCount = parseInt(bedCountResult.rows[0].count);
      
      if (existingBedCount >= roomCapacity) {
        return res.status(400).json({ 
          message: `Cannot move bed. Target room capacity is ${roomCapacity} but already has ${existingBedCount} beds` 
        });
      }
    }
    
    const existingBed = await pool.query(
      'SELECT id FROM beds WHERE room_id = $1 AND bed_identifier = $2 AND id != $3 AND org_id = $4',
      [roomId, bedIdentifier, id, req.orgId]
    );
    
    if (existingBed.rows.length > 0) {
      return res.status(400).json({ message: 'A bed with this identifier already exists in the target room' });
    }
    
    const BedModel = require('../models/Bed');
    const bed = await BedModel.update(id, roomId, bedIdentifier, status, req.orgId);
    res.json(bed);
  } catch (error) {
    console.error('Error updating bed:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteBed = async (req, res) => {
  try {
    const { id } = req.params;
    const BedModel = require('../models/Bed');
    const bed = await BedModel.delete(id, req.orgId);
    res.json({ message: 'Bed deleted successfully', bed });
  } catch (error) {
    console.error('Error deleting bed:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPaymentInfo = async (req, res) => {
  try {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthName = prevMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
    const monthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0, 23, 59, 59);

    const query = `
      SELECT t.id, t.email, t.rent, t.start_date, t.end_date, t.bed_id, t.phone,
             u.name,
             b.bed_identifier, r.room_number, bl.name as building_name,
             (
               SELECT COUNT(*) FROM payments p
               WHERE p.tenant_id = t.id
                 AND p.status = 'completed'
                 AND p.payment_date >= $1
                 AND p.payment_date <= $2
             ) as paid_count
      FROM tenants t
      JOIN users u ON t.user_id = u.id
      JOIN beds b ON t.bed_id = b.id
      JOIN rooms r ON b.room_id = r.id
      JOIN buildings bl ON r.building_id = bl.id
      WHERE t.org_id = $3
      ORDER BY bl.name, r.room_number, b.bed_identifier
    `;
    const result = await pool.query(query, [monthStart, monthEnd, req.orgId]);
    const tenants = result.rows.map(row => ({
      ...row,
      payment_status: parseInt(row.paid_count) > 0 ? 'Paid' : 'Not Paid',
      bed_info: `${row.building_name} - Room ${row.room_number} - ${row.bed_identifier || 'Bed'}`,
      month_name: prevMonthName
    }));
    res.json({ tenants, monthName: prevMonthName });
  } catch (error) {
    console.error('Error fetching payment info:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const sendPaymentReminderEmail = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const method = req.query.method || 'email';
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthName = prevMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    const query = `
      SELECT t.id, t.email, t.rent, t.phone,
             u.name,
             b.bed_identifier, r.room_number, bl.name as building_name
      FROM tenants t
      JOIN users u ON t.user_id = u.id
      JOIN beds b ON t.bed_id = b.id
      JOIN rooms r ON b.room_id = r.id
      JOIN buildings bl ON r.building_id = bl.id
      WHERE t.id = $1 AND t.org_id = $2
    `;
    const result = await pool.query(query, [tenantId, req.orgId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    const tenant = result.rows[0];
    const bedInfo = `${tenant.building_name} - Room ${tenant.room_number} - ${tenant.bed_identifier || 'Bed'}`;

    if (method === 'whatsapp') {
      if (!tenant.phone) {
        return res.status(400).json({ message: 'Tenant does not have a phone number. Please add one first.' });
      }
      // Strip non-digits, ensure country code
      let phone = tenant.phone.replace(/[^0-9]/g, '');
      if (phone.length === 10) phone = '91' + phone; // Default India country code
      const message = `Hi ${tenant.name}, this is a friendly reminder that your rent of ₹${tenant.rent} for ${prevMonthName} is pending. Your accommodation: ${bedInfo}. Please make the payment at your earliest convenience. Thank you!`;
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      return res.json({ message: 'WhatsApp link generated', whatsappUrl });
    }

    // Default: email
    const emailSent = await sendPaymentReminder(tenant.email, tenant.name, tenant.rent, bedInfo, prevMonthName);
    if (emailSent) {
      res.json({ message: `Payment reminder sent to ${tenant.email}` });
    } else {
      res.status(500).json({ message: 'Failed to send reminder email. Check email configuration.' });
    }
  } catch (error) {
    console.error('Error sending payment reminder:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markOfflinePay = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthName = prevMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    const monthStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
    const monthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0, 23, 59, 59);

    const existingPayment = await pool.query(
      `SELECT id FROM payments WHERE tenant_id = $1 AND status = 'completed' AND payment_date >= $2 AND payment_date <= $3`,
      [tenantId, monthStart, monthEnd]
    );
    if (existingPayment.rows.length > 0) {
      return res.status(400).json({ message: 'Payment already recorded for this month' });
    }

    // Get full tenant details for receipt
    const tenantQuery = `
      SELECT t.id, t.email, t.rent,
             u.name,
             b.bed_identifier, r.room_number, bl.name as building_name
      FROM tenants t
      JOIN users u ON t.user_id = u.id
      JOIN beds b ON t.bed_id = b.id
      JOIN rooms r ON b.room_id = r.id
      JOIN buildings bl ON r.building_id = bl.id
      WHERE t.id = $1 AND t.org_id = $2
    `;
    const tenantResult = await pool.query(tenantQuery, [tenantId, req.orgId]);
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    
    const tenant = tenantResult.rows[0];
    const bedInfo = `${tenant.building_name} - Room ${tenant.room_number} - ${tenant.bed_identifier || 'Bed'}`;
    const paymentDate = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 15);

    await pool.query(
      `INSERT INTO payments (tenant_id, amount, status, payment_date, razorpay_payment_id, org_id) VALUES ($1, $2, 'completed', $3, $4, $5)`,
      [tenantId, tenant.rent, paymentDate, 'OFFLINE_' + Date.now(), req.orgId]
    );

    // Send rent receipt email
    const emailSent = await sendRentReceipt(tenant.email, tenant.name, tenant.rent, bedInfo, prevMonthName, paymentDate);

    res.json({ 
      message: 'Offline payment marked successfully',
      receiptSent: emailSent,
      receiptMessage: emailSent ? 'Receipt sent to tenant email' : 'Payment recorded but receipt email could not be sent'
    });
  } catch (error) {
    console.error('Error marking offline payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getTenants, createTenant, updateTenant, deleteTenant, processCheckouts, getOccupancy, getAvailableBeds, getFloorLayout, getBuildings, createBuilding, updateBuilding, deleteBuilding, getRooms, createRoom, updateRoom, deleteRoom, getBeds, createBed, updateBed, deleteBed, getPaymentInfo, sendPaymentReminderEmail, markOfflinePay };