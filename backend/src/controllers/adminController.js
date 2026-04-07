const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Bed = require('../models/Bed');
const { sendTenantCredentials, sendPaymentReminder, sendRentReceipt } = require('../services/emailService');

const getTenants = async (req, res) => {
  try {
    const tenants = await Tenant.findAll(req.pool);
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const createTenant = async (req, res) => {
  const client = await req.pool.connect();
  try {
    const { name, email, password, bedId, startDate, endDate, rent, phone } = req.body;
    
    if (!name || !email || !password || !bedId || !rent) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    console.log(`📝 Creating tenant: ${name} (${email}) for org ${req.orgId}`);

    // Start transaction
    await client.query('BEGIN');

    const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Already this mail id is used' });
    }

    // Verify bed exists in this org database
    const bedCheck = await client.query('SELECT id FROM beds WHERE id = $1', [bedId]);
    if (bedCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Bed not found or does not belong to your organization' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await client.query(
      'INSERT INTO users (name, email, password, role, is_first_login) VALUES ($1, $2, $3, $4, TRUE) RETURNING *',
      [name, email, hashedPassword, 'tenant']
    );
    const user = userResult.rows[0];
    console.log(`✓ User created: ID ${user.id}`);

    // Create tenant
    const tenantResult = await client.query(
      'INSERT INTO tenants (user_id, email, bed_id, start_date, end_date, rent, phone) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [user.id, email, bedId, startDate, endDate || null, rent, phone || null]
    );
    const tenant = tenantResult.rows[0];
    console.log(`✓ Tenant created: ID ${tenant.id}`);

    // Update bed status
    await client.query(
      'UPDATE beds SET status = $1 WHERE id = $2',
      ['occupied', bedId]
    );
    console.log(`✓ Bed ${bedId} marked as occupied`);

    // Commit transaction
    await client.query('COMMIT');
    console.log(`✅ Tenant ${tenant.id} fully created and committed`);

    // Add org mapping for cross-org login
    try {
      await User.addOrgMapping(email, req.orgId, user.id, 'tenant');
    } catch (e) {
      console.warn('Warning: Could not add org mapping:', e.message);
    }

    // Respond immediately - don't wait for email
    res.status(201).json({ 
      message: 'Tenant created successfully',
      tenant: { id: tenant.id, name, email, bedId, startDate, endDate, rent },
      credentials: { email, password }
    });

    // Send email in background (fire and forget)
    try {
      const bedQuery = `
        SELECT b.id, r.room_number, bl.name as building_name 
        FROM beds b 
        JOIN rooms r ON b.room_id = r.id 
        JOIN buildings bl ON r.building_id = bl.id 
        WHERE b.id = $1
      `;
      const bedResult = await req.pool.query(bedQuery, [bedId]);
      const bedInfo = bedResult.rows[0] 
        ? `${bedResult.rows[0].building_name} - Room ${bedResult.rows[0].room_number}`
        : 'Bed assigned';
      sendTenantCredentials(email, name, password, bedInfo)
        .then(sent => console.log(sent ? `✅ Email sent to ${email}` : `⚠️ Email failed for ${email}`))
        .catch(err => console.error('❌ Email error:', err.message));
    } catch (emailErr) {
      console.error('❌ Email prep error:', emailErr.message);
    }
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
    const tenant = await Tenant.update(req.pool, id, updates);
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const tenant = await Tenant.findById(req.pool, id);
    
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    await req.pool.query('DELETE FROM payments WHERE tenant_id = $1', [id]);

    if (tenant.bed_id) {
      await Bed.updateStatus(req.pool, tenant.bed_id, 'vacant');
    }

    await Tenant.delete(req.pool, id);
    await req.pool.query("DELETE FROM users WHERE id = $1 AND role = 'tenant'", [tenant.user_id]);

    // Remove org mapping
    try {
      await User.removeOrgMapping(tenant.email, req.orgId);
    } catch (e) {
      console.warn('Warning: Could not remove org mapping:', e.message);
    }

    res.json({ message: 'Tenant and associated records deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const processCheckouts = async (req, res) => {
  try {
    const { processTenantCheckouts } = require('../services/tenantCheckoutService');
    const result = await processTenantCheckouts(req.pool, req.orgId);
    
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
    const result = await req.pool.query("SELECT COUNT(*) as occupied FROM beds WHERE status = 'occupied'");
    const totalResult = await req.pool.query('SELECT COUNT(*) as total FROM beds');
    res.json({ occupied: result.rows[0].occupied, total: totalResult.rows[0].total });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getAvailableBeds = async (req, res) => {
  try {
    const query = `SELECT b.id, b.room_id, b.bed_identifier, b.status, r.room_number, r.building_id, bl.name as building_name 
      FROM beds b JOIN rooms r ON b.room_id = r.id JOIN buildings bl ON r.building_id = bl.id 
      WHERE b.status = 'vacant' 
      ORDER BY bl.name, r.room_number, b.bed_identifier`;
    const result = await req.pool.query(query);
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
    const floors = await Room.getFloorLayout(req.pool, buildingId);
    res.json(floors);
  } catch (error) {
    console.error('Error fetching floor layout:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getFloorLayoutWithBeds = async (req, res) => {
  try {
    const { buildingId } = req.query;
    if (!buildingId) {
      return res.status(400).json({ message: 'buildingId is required' });
    }
    
    const Room = require('../models/Room');
    const floors = await Room.getFloorLayoutWithBeds(req.pool, buildingId);
    res.json(floors);
  } catch (error) {
    console.error('Error fetching floor layout with beds:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBuildings = async (req, res) => {
  try {
    const Building = require('../models/Building');
    const buildings = await Building.findAll(req.pool);
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
    const building = await Building.create(req.pool, name, location);
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
    const building = await Building.update(req.pool, id, name, location);
    res.json(building);
  } catch (error) {
    console.error('Error updating building:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteBuilding = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if any rooms exist in this building
    const roomCheck = await req.pool.query(
      'SELECT COUNT(*) as count FROM rooms WHERE building_id = $1', [id]
    );
    if (parseInt(roomCheck.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Rooms exist in this building, cannot delete. Remove all rooms first.' });
    }

    const Building = require('../models/Building');
    const building = await Building.delete(req.pool, id);
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
      ORDER BY bl.name, r.room_number`;
    const result = await req.pool.query(query);
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
    const room = await Room.create(req.pool, buildingId, roomNumber, capacity);
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
    const room = await Room.update(req.pool, id, buildingId, roomNumber, capacity);
    res.json(room);
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if any tenant is occupying a bed in this room
    const tenantCheck = await req.pool.query(
      'SELECT COUNT(*) as count FROM tenants t JOIN beds b ON t.bed_id = b.id WHERE b.room_id = $1', [id]
    );
    if (parseInt(tenantCheck.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Tenants occupied, cannot delete this room' });
    }

    // Check if any beds exist in this room
    const bedCheck = await req.pool.query(
      'SELECT COUNT(*) as count FROM beds WHERE room_id = $1', [id]
    );
    if (parseInt(bedCheck.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Beds exist in this room, cannot delete. Remove all beds first.' });
    }

    const Room = require('../models/Room');
    const room = await Room.delete(req.pool, id);
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
      ORDER BY bl.name, r.room_number, b.id`;
    const result = await req.pool.query(query);
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
    
    const roomResult = await req.pool.query('SELECT capacity FROM rooms WHERE id = $1', [roomId]);
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ message: 'Room not found' });
    }
    const roomCapacity = roomResult.rows[0].capacity;
    
    const bedCountResult = await req.pool.query('SELECT COUNT(*) as count FROM beds WHERE room_id = $1', [roomId]);
    const existingBedCount = parseInt(bedCountResult.rows[0].count);
    
    if (existingBedCount >= roomCapacity) {
      return res.status(400).json({ 
        message: `Cannot add more beds. Room capacity is ${roomCapacity} but already has ${existingBedCount} beds` 
      });
    }
    
    const existingBed = await req.pool.query(
      'SELECT id FROM beds WHERE room_id = $1 AND bed_identifier = $2',
      [roomId, bedIdentifier]
    );
    
    if (existingBed.rows.length > 0) {
      return res.status(400).json({ message: 'A bed with this identifier already exists in this room' });
    }
    
    const BedModel = require('../models/Bed');
    const bed = await BedModel.create(req.pool, roomId, bedIdentifier, status || 'vacant');
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
    
    const currentBedResult = await req.pool.query('SELECT room_id FROM beds WHERE id = $1', [id]);
    if (currentBedResult.rows.length === 0) {
      return res.status(404).json({ message: 'Bed not found' });
    }
    const currentRoomId = currentBedResult.rows[0].room_id;
    
    if (parseInt(roomId) !== currentRoomId) {
      const roomResult = await req.pool.query('SELECT capacity FROM rooms WHERE id = $1', [roomId]);
      if (roomResult.rows.length === 0) {
        return res.status(404).json({ message: 'Target room not found' });
      }
      const roomCapacity = roomResult.rows[0].capacity;
      
      const bedCountResult = await req.pool.query('SELECT COUNT(*) as count FROM beds WHERE room_id = $1', [roomId]);
      const existingBedCount = parseInt(bedCountResult.rows[0].count);
      
      if (existingBedCount >= roomCapacity) {
        return res.status(400).json({ 
          message: `Cannot move bed. Target room capacity is ${roomCapacity} but already has ${existingBedCount} beds` 
        });
      }
    }
    
    const existingBed = await req.pool.query(
      'SELECT id FROM beds WHERE room_id = $1 AND bed_identifier = $2 AND id != $3',
      [roomId, bedIdentifier, id]
    );
    
    if (existingBed.rows.length > 0) {
      return res.status(400).json({ message: 'A bed with this identifier already exists in the target room' });
    }
    
    const BedModel = require('../models/Bed');
    const bed = await BedModel.update(req.pool, id, roomId, bedIdentifier, status);
    res.json(bed);
  } catch (error) {
    console.error('Error updating bed:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteBed = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if any tenant is occupying this bed
    const tenantCheck = await req.pool.query(
      'SELECT COUNT(*) as count FROM tenants WHERE bed_id = $1', [id]
    );
    if (parseInt(tenantCheck.rows[0].count) > 0) {
      return res.status(400).json({ message: 'Tenants occupied, cannot delete this bed' });
    }

    const BedModel = require('../models/Bed');
    const bed = await BedModel.delete(req.pool, id);
    res.json({ message: 'Bed deleted successfully', bed });
  } catch (error) {
    console.error('Error deleting bed:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPaymentInfo = async (req, res) => {
  try {
    const now = new Date();
    
    // Get month and year from query parameters, default to previous month
    let month = req.query.month ? parseInt(req.query.month) : now.getMonth() - 1;
    let year = req.query.year ? parseInt(req.query.year) : now.getFullYear();
    
    // Handle month overflow
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    
    const selectedDate = new Date(year, month, 1);
    const monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // DB stores 1-based months (1=Jan, 2=Feb, ..., 12=Dec)
    const dbMonth = month + 1;

    const query = `
      SELECT t.id, t.email, t.rent, t.start_date, t.end_date, t.bed_id, t.phone,
             u.name,
             b.bed_identifier, r.room_number, bl.name as building_name,
             p.id as payment_id, p.tenant_name as paid_tenant_name, p.amount as paid_amount,
             p.status as pay_status, p.payment_date, p.razorpay_payment_id
      FROM tenants t
      JOIN users u ON t.user_id = u.id
      JOIN beds b ON t.bed_id = b.id
      JOIN rooms r ON b.room_id = r.id
      JOIN buildings bl ON r.building_id = bl.id
      LEFT JOIN payments p ON p.tenant_id = t.id
        AND p.payment_month = $1
        AND p.payment_year = $2
        AND p.status = 'completed'
      ORDER BY bl.name, r.room_number, b.bed_identifier
    `;
    const result = await req.pool.query(query, [dbMonth, year]);
    const tenants = result.rows.map(row => {
      const proratedAmount = calculateProratedRent(
        month,
        year,
        new Date(row.start_date),
        row.end_date ? new Date(row.end_date) : null,
        row.rent
      );
      return {
        ...row,
        payment_status: row.payment_id ? 'Paid' : 'Bill Generated',
        bed_info: `${row.building_name} - Room ${row.room_number} - ${row.bed_identifier || 'Bed'}`,
        month_name: monthName,
        billAmount: proratedAmount
      };
    }).filter(t => t.billAmount > 0 || t.payment_status === 'Paid');
    res.json({ tenants, monthName, month, year });
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
      WHERE t.id = $1
    `;
    const result = await req.pool.query(query, [tenantId]);
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
    const { month, year } = req.body;
    
    // Use provided month/year or default to previous month
    const now = new Date();
    let payMonth = month != null ? parseInt(month) : now.getMonth() - 1;
    let payYear = year != null ? parseInt(year) : now.getFullYear();
    if (payMonth < 0) { payMonth = 11; payYear -= 1; }
    
    const selectedDate = new Date(payYear, payMonth, 1);
    const monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // DB stores 1-based months (1=Jan, 2=Feb, ..., 12=Dec)
    const dbMonth = payMonth + 1;

    // Check for existing payment for this tenant+month+year
    const existingPayment = await req.pool.query(
      `SELECT id FROM payments WHERE tenant_id = $1 AND payment_month = $2 AND payment_year = $3 AND status = 'completed'`,
      [tenantId, dbMonth, payYear]
    );
    if (existingPayment.rows.length > 0) {
      return res.status(400).json({ message: `Payment already recorded for ${monthName}` });
    }

    // Get full tenant details for receipt
    const tenantQuery = `
      SELECT t.id, t.email, t.rent, t.phone,
             u.name,
             b.bed_identifier, r.room_number, bl.name as building_name
      FROM tenants t
      JOIN users u ON t.user_id = u.id
      JOIN beds b ON t.bed_id = b.id
      JOIN rooms r ON b.room_id = r.id
      JOIN buildings bl ON r.building_id = bl.id
      WHERE t.id = $1
    `;
    const tenantResult = await req.pool.query(tenantQuery, [tenantId]);
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    
    const tenant = tenantResult.rows[0];
    const bedInfo = `${tenant.building_name} - Room ${tenant.room_number} - ${tenant.bed_identifier || 'Bed'}`;

    await req.pool.query(
      `INSERT INTO payments (tenant_id, tenant_name, email, phone, amount, status, payment_month, payment_year, razorpay_payment_id)
       VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7, $8)`,
      [tenantId, tenant.name, tenant.email, tenant.phone || null, tenant.rent, dbMonth, payYear, 'OFFLINE_' + Date.now()]
    );

    // Send rent receipt email
    const emailSent = await sendRentReceipt(tenant.email, tenant.name, tenant.rent, bedInfo, monthName, new Date());

    res.json({ 
      message: `Offline payment marked for ${monthName}`,
      receiptSent: emailSent,
      receiptMessage: emailSent ? 'Receipt sent to tenant email' : 'Payment recorded but receipt email could not be sent'
    });
  } catch (error) {
    console.error('Error marking offline payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const searchTenants = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const searchTerm = `%${q.trim()}%`;
    const query = `
      SELECT t.id, t.email, t.phone, t.rent, t.start_date, t.end_date, t.bed_id,
             u.name,
             b.bed_identifier, r.room_number, bl.name as building_name
      FROM tenants t
      JOIN users u ON t.user_id = u.id
      JOIN beds b ON t.bed_id = b.id
      JOIN rooms r ON b.room_id = r.id
      JOIN buildings bl ON r.building_id = bl.id
      WHERE u.name ILIKE $1 OR t.email ILIKE $1 OR t.phone ILIKE $1
      ORDER BY u.name
      LIMIT 20
    `;
    const result = await req.pool.query(query, [searchTerm]);
    const tenants = result.rows.map(row => ({
      ...row,
      bed_info: `${row.building_name} - Room ${row.room_number} - ${row.bed_identifier || 'Bed'}`
    }));
    res.json(tenants);
  } catch (error) {
    console.error('Error searching tenants:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to calculate prorated rent for a given month
// Rules:
//   - Joined on or before 1st of billing month → full rent
//   - Joined after billing month ends → ₹0 (not a tenant yet)
//   - Joined mid-month → charge for remaining days: daysInMonth - joinDay
//     e.g. joined 10th in 30-day month = 20 days, joined 30th in 31-day month = 1 day
const calculateProratedRent = (monthIndex, year, startDate, endDate, monthlyRent) => {
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0); // last day of month
  const daysInMonth = monthEnd.getDate();

  // Tenant joined after this billing month → no charge
  if (startDate > monthEnd) return 0;

  // Tenant checked out before this billing month → no charge
  if (endDate && endDate < monthStart) return 0;

  // Tenant was present from the 1st (or before) → full rent
  if (startDate <= monthStart) {
    // But if checkout happened mid-month, prorate
    if (endDate && endDate >= monthStart && endDate < monthEnd) {
      const daysCharged = endDate.getDate();
      return Math.round((daysCharged / daysInMonth) * monthlyRent);
    }
    return monthlyRent;
  }

  // Joined mid-month: charge remaining days after join date
  const joinDay = startDate.getDate();
  const lastDay = (endDate && endDate < monthEnd) ? endDate.getDate() : daysInMonth;
  const daysCharged = lastDay - joinDay;

  // If joined and left same day (or end before start in same month), charge at least 1 day
  if (daysCharged <= 0) {
    if (!endDate || endDate >= startDate) {
      return Math.round((1 / daysInMonth) * monthlyRent);
    }
    return 0;
  }

  return Math.round((daysCharged / daysInMonth) * monthlyRent);
};

const getTenantPaymentHistory = async (req, res) => {
  try {
    const { tenantId } = req.params;

    // Get tenant details
    const tenantQuery = `
      SELECT t.id, t.email, t.phone, t.rent, t.start_date, t.end_date,
             u.name,
             b.bed_identifier, r.room_number, bl.name as building_name
      FROM tenants t
      JOIN users u ON t.user_id = u.id
      JOIN beds b ON t.bed_id = b.id
      JOIN rooms r ON b.room_id = r.id
      JOIN buildings bl ON r.building_id = bl.id
      WHERE t.id = $1
    `;
    const tenantResult = await req.pool.query(tenantQuery, [tenantId]);
    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    const tenant = tenantResult.rows[0];
    tenant.bed_info = `${tenant.building_name} - Room ${tenant.room_number} - ${tenant.bed_identifier || 'Bed'}`;

    // Get all payments for this tenant
    const paymentsResult = await req.pool.query(
      `SELECT id, payment_month, payment_year, amount, status, payment_date, razorpay_payment_id
       FROM payments WHERE tenant_id = $1 ORDER BY payment_year, payment_month`,
      [tenantId]
    );

    // Build month-wise payment grid from start_date to now (or end_date)
    const startDate = new Date(tenant.start_date);
    const now = new Date();
    const endDate = tenant.end_date ? new Date(tenant.end_date) : now;
    const gridEnd = endDate > now ? now : endDate;

    const paymentMap = {};
    for (const p of paymentsResult.rows) {
      const key = `${p.payment_year}-${p.payment_month}`;
      paymentMap[key] = p;
    }

    const months = [];
    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (current <= gridEnd) {
      const m = current.getMonth() + 1; // 1-based
      const y = current.getFullYear();
      const key = `${y}-${m}`;
      const payment = paymentMap[key] || null;

      // Calculate prorated amount for this month
      const proratedAmount = calculateProratedRent(current.getMonth(), y, startDate, endDate, tenant.rent);

      months.push({
        month: m,
        year: y,
        monthName: current.toLocaleString('default', { month: 'long', year: 'numeric' }),
        status: payment && payment.status === 'completed' ? 'Paid' : 'Bill Generated',
        billAmount: proratedAmount,
        payment: payment || null
      });
      current.setMonth(current.getMonth() + 1);
    }

    res.json({ tenant, months });
  } catch (error) {
    console.error('Error fetching tenant payment history:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getTenants, createTenant, updateTenant, deleteTenant, processCheckouts, getOccupancy, getAvailableBeds, getFloorLayout, getFloorLayoutWithBeds, getBuildings, createBuilding, updateBuilding, deleteBuilding, getRooms, createRoom, updateRoom, deleteRoom, getBeds, createBed, updateBed, deleteBed, getPaymentInfo, sendPaymentReminderEmail, markOfflinePay, searchTenants, getTenantPaymentHistory };