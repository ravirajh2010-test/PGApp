const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Bed = require('../models/Bed');
const Organization = require('../models/Organization');
const { sendTenantCredentials, sendPaymentReminder, sendRentReceipt, sendDeactivationEmail, sendPasswordResetByAdmin } = require('../services/emailService');
const { logRequestAudit } = require('../services/auditService');

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

    // Only block duplicates within the SAME organization. Tenants may legitimately
    // exist across multiple orgs (e.g. a person who moved between PGs); we surface
    // the prior org info to admins via a separate lookup endpoint.
    const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'A tenant with this email already exists in your organization.' });
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

    // Send welcome email before responding
    let emailSent = false;
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
      emailSent = await sendTenantCredentials(email, name, password, bedInfo, req.orgName);
    } catch (emailErr) {
      console.error('❌ Email error:', emailErr.message);
    }

    res.status(201).json({ 
      message: 'Tenant created successfully',
      tenant: { id: tenant.id, name, email, bedId, startDate, endDate, rent },
      credentials: { email, password },
      emailSent
    });
    await logRequestAudit(req, {
      action: 'TENANT_CREATED',
      entityType: 'tenant',
      entityId: tenant.id,
      details: { name, email, bedId, rent },
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
    const tenant = await Tenant.update(req.pool, id, updates);
    await logRequestAudit(req, {
      action: 'TENANT_UPDATED',
      entityType: 'tenant',
      entityId: Number(id),
      details: updates,
    });
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

    await logRequestAudit(req, {
      action: 'TENANT_DELETED',
      entityType: 'tenant',
      entityId: Number(id),
      details: { email: tenant.email, userId: tenant.user_id, bedId: tenant.bed_id },
    });
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
    await logRequestAudit(req, {
      action: 'BUILDING_CREATED',
      entityType: 'building',
      entityId: building.id,
      details: { name, location },
    });
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
    await logRequestAudit(req, {
      action: 'BUILDING_UPDATED',
      entityType: 'building',
      entityId: Number(id),
      details: { name, location },
    });
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
    await logRequestAudit(req, {
      action: 'BUILDING_DELETED',
      entityType: 'building',
      entityId: Number(id),
      details: { name: building?.name || null },
    });
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

    // Check for duplicate room number in the same building
    const existing = await req.pool.query(
      'SELECT id FROM rooms WHERE building_id = $1 AND room_number = $2',
      [buildingId, roomNumber]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: `Room ${roomNumber} already exists in this building` });
    }
    
    const Room = require('../models/Room');
    const room = await Room.create(req.pool, buildingId, roomNumber, capacity);
    await logRequestAudit(req, {
      action: 'ROOM_CREATED',
      entityType: 'room',
      entityId: room.id,
      details: { buildingId, roomNumber, capacity },
    });
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

    // Check for duplicate room number in the same building (exclude current room)
    const existing = await req.pool.query(
      'SELECT id FROM rooms WHERE building_id = $1 AND room_number = $2 AND id != $3',
      [buildingId, roomNumber, id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: `Room ${roomNumber} already exists in this building` });
    }
    
    const Room = require('../models/Room');
    const room = await Room.update(req.pool, id, buildingId, roomNumber, capacity);
    await logRequestAudit(req, {
      action: 'ROOM_UPDATED',
      entityType: 'room',
      entityId: Number(id),
      details: { buildingId, roomNumber, capacity },
    });
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
    await logRequestAudit(req, {
      action: 'ROOM_DELETED',
      entityType: 'room',
      entityId: Number(id),
      details: { roomNumber: room?.room_number || null, buildingId: room?.building_id || null },
    });
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
    await logRequestAudit(req, {
      action: 'BED_CREATED',
      entityType: 'bed',
      entityId: bed.id,
      details: { roomId, bedIdentifier, status: status || 'vacant' },
    });
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
    await logRequestAudit(req, {
      action: 'BED_UPDATED',
      entityType: 'bed',
      entityId: Number(id),
      details: { roomId, bedIdentifier, status },
    });
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
    await logRequestAudit(req, {
      action: 'BED_DELETED',
      entityType: 'bed',
      entityId: Number(id),
      details: { bedIdentifier: bed?.bed_identifier || null, roomId: bed?.room_id || null },
    });
    res.json({ message: 'Bed deleted successfully', bed });
  } catch (error) {
    console.error('Error deleting bed:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPaymentInfo = async (req, res) => {
  try {
    const now = new Date();
    
    // Get month and year from query parameters, default to current month
    let month = req.query.month != null ? parseInt(req.query.month) : now.getMonth();
    let year = req.query.year ? parseInt(req.query.year) : now.getFullYear();
    
    // Handle month overflow
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    
    const selectedDate = new Date(year, month, 1);
    const monthName = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Determine if a bill has been generated for this month.
    // Bills are generated on the 2nd of the NEXT month.
    // So for a given month, check if we are on or past the 2nd of the following month.
    const billGenDate = new Date(year, month + 1, 2); // 2nd of the next month
    const isCurrentMonth = (month === now.getMonth() && year === now.getFullYear());
    const isBillGenerated = now >= billGenDate; // past the 2nd of next month = bill generated
    // If viewing the current month and today is before the 2nd of next month, bill is not yet generated
    const billStatus = isCurrentMonth && !isBillGenerated ? 'NA' : 'Bill Generated';

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

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const daysInMonth = monthEnd.getDate();

    const tenants = result.rows.map(row => {
      const startDate = new Date(row.start_date);
      const endDate = row.end_date ? new Date(row.end_date) : null;
      const proratedAmount = calculateProratedRent(month, year, startDate, endDate, row.rent);

      // Calculate actual days stayed for proration display (inclusive of both dates)
      let daysStayed = daysInMonth;
      if (startDate > monthStart) {
        const joinDay = startDate.getDate();
        const lastDay = (endDate && endDate < monthEnd) ? endDate.getDate() : daysInMonth;
        daysStayed = Math.max(lastDay - joinDay + 1, 1); // +1 inclusive
      } else if (endDate && endDate >= monthStart && endDate < monthEnd) {
        daysStayed = endDate.getDate(); // days 1..N = N days (already inclusive)
      }

      return {
        ...row,
        payment_status: row.payment_id ? 'Paid' : billStatus,
        bed_info: `${row.building_name} - Room ${row.room_number} - ${row.bed_identifier || 'Bed'}`,
        month_name: monthName,
        billAmount: proratedAmount,
        daysStayed,
        daysInMonth,
        isProrated: proratedAmount !== row.rent
      };
    }).filter(t => t.billAmount > 0 || t.payment_status === 'Paid');
    res.json({ tenants, monthName, month, year, billStatus });
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

    // Default: email - respond immediately, send in background
    await logRequestAudit(req, {
      action: 'PAYMENT_REMINDER_SENT',
      entityType: 'tenant',
      entityId: Number(tenantId),
      details: { method, email: tenant.email, month: prevMonthName },
    });
    res.json({ message: `Payment reminder being sent to ${tenant.email}` });
    sendPaymentReminder(tenant.email, tenant.name, tenant.rent, bedInfo, prevMonthName, req.orgName)
      .then(sent => console.log(sent ? `✅ Reminder sent to ${tenant.email}` : `⚠️ Reminder failed for ${tenant.email}`))
      .catch(err => console.error('❌ Reminder email error:', err.message));
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
             u.name, u.email as user_email,
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
    const tenantEmail = tenant.email || tenant.user_email;

    await req.pool.query(
      `INSERT INTO payments (tenant_id, tenant_name, email, phone, amount, status, payment_month, payment_year, razorpay_payment_id)
       VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7, $8)`,
      [tenantId, tenant.name, tenantEmail, tenant.phone || null, tenant.rent, dbMonth, payYear, 'OFFLINE_' + Date.now()]
    );

    // Send rent receipt email before responding
    let emailSent = false;
    if (tenantEmail) {
      try {
        console.log(`📧 Sending rent receipt to ${tenantEmail} for ${monthName}...`);
        emailSent = await sendRentReceipt(tenantEmail, tenant.name, tenant.rent, bedInfo, monthName, new Date(), req.orgName);
      } catch (err) {
        console.error('❌ Receipt email error:', err.message);
      }
    } else {
      console.warn(`⚠️ No email found for tenant ${tenantId}, skipping receipt`);
    }

    res.json({ 
      message: `Offline payment marked for ${monthName}`,
      emailSent
    });
    await logRequestAudit(req, {
      action: 'OFFLINE_PAYMENT_MARKED',
      entityType: 'tenant',
      entityId: Number(tenantId),
      details: { month: monthName, amount: tenant.rent, emailSent },
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
//   - Both check-in and check-out dates are inclusive
//   - Joined on or before 1st of billing month → full rent (unless checkout mid-month)
//   - Joined after billing month ends → ₹0 (not a tenant yet)
//   - Joined mid-month → charge for (lastDay - joinDay + 1) days (inclusive)
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
    // But if checkout happened mid-month, prorate (inclusive of checkout day)
    if (endDate && endDate >= monthStart && endDate < monthEnd) {
      const daysCharged = endDate.getDate(); // days 1..N = N days (already inclusive)
      return Math.round((daysCharged / daysInMonth) * monthlyRent);
    }
    return monthlyRent;
  }

  // Joined mid-month: charge from joinDay to lastDay (inclusive of both)
  const joinDay = startDate.getDate();
  const lastDay = (endDate && endDate < monthEnd) ? endDate.getDate() : daysInMonth;
  const daysCharged = lastDay - joinDay + 1; // +1 for inclusive of both dates

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

const deactivateUser = async (req, res) => {
  const client = await req.pool.connect();
  try {
    const { userId } = req.params;

    await client.query('BEGIN');

    // Get user details
    const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'User not found' });
    }
    const user = userResult.rows[0];

    // Check if user has a tenant record with bed allocation
    const tenantResult = await client.query(
      `SELECT t.id, t.email, t.bed_id, t.rent, t.start_date, t.phone,
              b.bed_identifier, r.room_number, bl.name as building_name
       FROM tenants t
       JOIN beds b ON t.bed_id = b.id
       JOIN rooms r ON b.room_id = r.id
       JOIN buildings bl ON r.building_id = bl.id
       WHERE t.user_id = $1`,
      [userId]
    );

    let bedInfo = 'N/A';

    if (tenantResult.rows.length > 0) {
      const tenant = tenantResult.rows[0];
      bedInfo = `${tenant.building_name} - Room ${tenant.room_number} - ${tenant.bed_identifier || 'Bed'}`;

      // Vacate the bed
      await client.query('UPDATE beds SET status = $1 WHERE id = $2', ['vacant', tenant.bed_id]);

      // Delete payments
      await client.query('DELETE FROM payments WHERE tenant_id = $1', [tenant.id]);

      // Delete tenant record
      await client.query('DELETE FROM tenants WHERE id = $1', [tenant.id]);
    }

    // Delete user
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');

    // Remove org mapping
    try {
      await User.removeOrgMapping(user.email, req.orgId);
    } catch (e) {
      console.warn('Warning: Could not remove org mapping:', e.message);
    }

    // Respond immediately
    res.json({ message: 'User deactivated successfully' });
    await logRequestAudit(req, {
      action: 'USER_DEACTIVATED',
      entityType: 'user',
      entityId: Number(userId),
      details: { email: user.email, role: user.role, bedInfo },
    });

    // Send farewell email in background
    try {
      const org = await Organization.findById(req.orgId);
      const orgName = org ? org.name : 'PG Stay';
      sendDeactivationEmail(user.email, user.name, bedInfo, orgName)
        .then(sent => console.log(sent ? `✅ Deactivation email sent to ${user.email}` : `⚠️ Deactivation email failed for ${user.email}`))
        .catch(err => console.error('❌ Deactivation email error:', err.message));
    } catch (emailErr) {
      console.error('❌ Email prep error:', emailErr.message);
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(e => console.error('Rollback error:', e));
    console.error('Error deactivating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    client.release();
  }
};

// Look up an email across all organizations to surface prior tenancy info to admins.
// This intentionally only returns minimal cross-org context (org name + slug + role)
// to help an admin avoid creating an unintended duplicate tenant.
const lookupTenantByEmail = async (req, res) => {
  try {
    const rawEmail = (req.query.email || '').trim().toLowerCase();
    if (!rawEmail) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const [mappings, currentOrgUser] = await Promise.all([
      User.findOrgsByEmail(rawEmail),
      req.pool.query('SELECT id FROM users WHERE email = $1', [rawEmail]),
    ]);

    const otherOrgs = (mappings || []).filter((m) => m.org_id !== req.orgId);

    res.json({
      email: rawEmail,
      existsInCurrentOrg: currentOrgUser.rows.length > 0,
      otherOrganizations: otherOrgs.map((m) => ({
        id: m.org_id,
        name: m.org_name,
        slug: m.org_slug,
        organizationCode: m.organization_code,
        role: m.role,
      })),
    });
  } catch (error) {
    console.error('Error looking up tenant by email:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get tenant groups for messenger
const getMessengerGroups = async (req, res) => {
  try {
    // Get all buildings
    const buildingsResult = await req.pool.query('SELECT id, name FROM buildings ORDER BY name');
    
    // Get all rooms with building info
    const roomsResult = await req.pool.query(`
      SELECT r.id, r.room_number, r.floor_number, r.building_id, bl.name as building_name
      FROM rooms r
      JOIN buildings bl ON r.building_id = bl.id
      ORDER BY bl.name, r.room_number
    `);
    
    // Get distinct floors per building
    const floorsResult = await req.pool.query(`
      SELECT DISTINCT r.floor_number, r.building_id, bl.name as building_name
      FROM rooms r
      JOIN buildings bl ON r.building_id = bl.id
      ORDER BY bl.name, r.floor_number
    `);
    
    res.json({
      buildings: buildingsResult.rows,
      rooms: roomsResult.rows,
      floors: floorsResult.rows
    });
  } catch (error) {
    console.error('Error fetching messenger groups:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send message to tenant group via email
const sendGroupMessage = async (req, res) => {
  try {
    const { groupType, groupId, subject, message } = req.body;
    
    if (!subject || !message) {
      return res.status(400).json({ message: 'Subject and message are required' });
    }
    
    let tenantsQuery;
    let queryParams = [];
    
    switch (groupType) {
      case 'all':
        tenantsQuery = `
          SELECT DISTINCT u.name, u.email
          FROM tenants t
          JOIN users u ON t.user_id = u.id
          WHERE u.email IS NOT NULL
        `;
        break;
      case 'building':
        tenantsQuery = `
          SELECT DISTINCT u.name, u.email
          FROM tenants t
          JOIN users u ON t.user_id = u.id
          JOIN beds b ON t.bed_id = b.id
          JOIN rooms r ON b.room_id = r.id
          WHERE r.building_id = $1 AND u.email IS NOT NULL
        `;
        queryParams = [groupId];
        break;
      case 'floor':
        const [buildingId, floorNumber] = groupId.split('-');
        tenantsQuery = `
          SELECT DISTINCT u.name, u.email
          FROM tenants t
          JOIN users u ON t.user_id = u.id
          JOIN beds b ON t.bed_id = b.id
          JOIN rooms r ON b.room_id = r.id
          WHERE r.building_id = $1 AND r.floor_number = $2 AND u.email IS NOT NULL
        `;
        queryParams = [buildingId, floorNumber];
        break;
      case 'room':
        tenantsQuery = `
          SELECT DISTINCT u.name, u.email
          FROM tenants t
          JOIN users u ON t.user_id = u.id
          JOIN beds b ON t.bed_id = b.id
          WHERE b.room_id = $1 AND u.email IS NOT NULL
        `;
        queryParams = [groupId];
        break;
      default:
        return res.status(400).json({ message: 'Invalid group type' });
    }
    
    const tenantsResult = await req.pool.query(tenantsQuery, queryParams);
    const tenants = tenantsResult.rows;
    
    if (tenants.length === 0) {
      return res.status(404).json({ message: 'No tenants found in the selected group' });
    }
    
    // Get org name for email branding
    const orgName = req.orgName || 'PG Stay';
    
    // Import sendEmail
    const { sendEmail } = require('../services/emailService');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const tenant of tenants) {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
              .header { background: linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; }
              .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
              .message-box { background: #f8f9fa; border-left: 4px solid #ff6b35; padding: 20px; margin: 20px 0; border-radius: 4px; white-space: pre-wrap; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>\uD83C\uDFE2 ${orgName}</h1>
                <p>Communication from Management</p>
              </div>
              <div class="content">
                <p>Dear <strong>${tenant.name}</strong>,</p>
                <div class="message-box">${message.replace(/\n/g, '<br/>')}</div>
                <p style="margin-top: 20px; color: #666; font-size: 14px;">If you have any questions, please contact the management.</p>
              </div>
              <div class="footer">
                <p>This message was sent by ${orgName} management.</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      const sent = await sendEmail(tenant.email, subject, htmlContent);
      if (sent) successCount++;
      else failCount++;
    }
    
    res.json({
      message: `Message sent to ${successCount} tenant(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
      successCount,
      failCount,
      totalTenants: tenants.length
    });
    await logRequestAudit(req, {
      action: 'GROUP_MESSAGE_SENT',
      entityType: 'message',
      details: { groupType, groupId, subject, successCount, failCount, totalTenants: tenants.length },
    });
  } catch (error) {
    console.error('Error sending group message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

const sendPasswordReset = async (req, res) => {
  try {
    const { userId } = req.params;
    const bcrypt = require('bcryptjs');

    const userResult = await req.pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = userResult.rows[0];

    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await req.pool.query(
      'UPDATE users SET password = $1, is_first_login = TRUE WHERE id = $2',
      [hashedPassword, userId]
    );

    const emailSent = await sendPasswordResetByAdmin(user.email, user.name, tempPassword, req.orgName);
    await logRequestAudit(req, {
      action: 'PASSWORD_RESET_BY_ADMIN',
      entityType: 'user',
      entityId: Number(userId),
      details: { email: user.email },
    });

    res.json({ message: `Password reset and email sent to ${user.email}`, emailSent });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getTenants, createTenant, updateTenant, deleteTenant, processCheckouts, getOccupancy, getAvailableBeds, getFloorLayout, getFloorLayoutWithBeds, getBuildings, createBuilding, updateBuilding, deleteBuilding, getRooms, createRoom, updateRoom, deleteRoom, getBeds, createBed, updateBed, deleteBed, getPaymentInfo, sendPaymentReminderEmail, markOfflinePay, searchTenants, getTenantPaymentHistory, deactivateUser, getMessengerGroups, sendGroupMessage, lookupTenantByEmail, sendPasswordReset };