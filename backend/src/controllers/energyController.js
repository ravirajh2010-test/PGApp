// Energy / electricity billing controller.
//
// Workflow:
//   1. Admin opens "Energy Calc" tab — backend returns rooms with the latest
//      reading (if any), the list of currently allocated tenants, and the
//      organization's default rate per unit.
//   2. Admin enters the current meter reading. We compute units consumed
//      against the previous reading (auto-fetched from the most recent
//      electricity_readings row for that room), the total amount, and the
//      per-person share (default sharing count = number of currently
//      allocated tenants in that room, admin can override).
//   3. Admin optionally clicks "Bill tenants" which inserts one row in
//      `payments` per tenant in that room (payment_type='electricity',
//      reading_id=<row id>) and marks the reading as billed.

const Organization = require('../models/Organization');
const whatsapp = require('../services/whatsappService');
const { logRequestAudit } = require('../services/auditService');
const dbManager = require('../services/DatabaseManager');

const ALLOWED_BILLING_STATUS = new Set(['pending', 'completed']);

// Effective floor for Energy Calc (matches Room.extractFloorFromRoomNumber when floor is unknown):
// — LPAD room_number to 3 chars, first digit 0 => ground (0), else that digit.
// — NULL floor_number: use inferred value (not DB default 1).
// — If DB has default floor_number=1 but room number implies ground (002 → first digit 0), use 0.
const ROOM_FLOOR_SQL = `(
  CASE
    WHEN r.floor_number = 1
      AND CAST(SUBSTRING(LPAD(TRIM(COALESCE(r.room_number::text, '')), 3, '0'), 1, 1) AS INTEGER) = 0
      THEN 0
    WHEN r.floor_number IS NOT NULL THEN r.floor_number
    ELSE CAST(SUBSTRING(LPAD(TRIM(COALESCE(r.room_number::text, '')), 3, '0'), 1, 1) AS INTEGER)
  END
)`;

// In multi-DB mode, org databases are not re-initialized on every server start.
// Ensure newer tables/columns exist before any energy query (idempotent).
const ensureEnergyOrgSchema = async (pool) => {
  await dbManager.initOrgSchema(pool);
};

// GET /api/admin/energy/rooms
// Returns each room with: capacity, current tenants, last reading, and
// suggested previous reading + sharing count.
const getRoomsForEnergy = async (req, res) => {
  try {
    await ensureEnergyOrgSchema(req.pool);

    const org = await Organization.findById(req.orgId);
    const defaultRate = Number(org?.default_electricity_rate || 8);

    const roomsResult = await req.pool.query(`
      SELECT r.id as room_id,
             r.room_number,
             r.capacity,
             (${ROOM_FLOOR_SQL.trim()}) AS floor_number,
             bl.id as building_id,
             bl.name as building_name
      FROM rooms r
      LEFT JOIN buildings bl ON r.building_id = bl.id
      ORDER BY bl.name, (${ROOM_FLOOR_SQL.trim()}), r.room_number
    `);

    if (roomsResult.rows.length === 0) {
      return res.json({ defaultRate, rooms: [] });
    }

    const roomIds = roomsResult.rows.map((r) => r.room_id);

    // Latest electricity reading per room (most recent first).
    const lastReadingsResult = await req.pool.query(
      `
      SELECT DISTINCT ON (er.room_id)
        er.id, er.room_id, er.previous_reading, er.current_reading,
        er.units_consumed, er.rate_per_unit, er.total_amount,
        er.sharing_count, er.per_person_amount, er.billing_month,
        er.billing_year, er.billed, er.billed_at, er.created_at
      FROM electricity_readings er
      WHERE er.room_id = ANY($1::int[])
      ORDER BY er.room_id, er.billing_year DESC, er.billing_month DESC, er.id DESC
      `,
      [roomIds]
    );

    const lastReadingByRoom = new Map();
    for (const row of lastReadingsResult.rows) {
      lastReadingByRoom.set(row.room_id, row);
    }

    // Currently allocated tenants per room.
    const tenantsResult = await req.pool.query(
      `
      SELECT t.id as tenant_id, u.name, t.email, t.phone, b.room_id
      FROM tenants t
      JOIN users u ON t.user_id = u.id
      JOIN beds b ON t.bed_id = b.id
      WHERE b.room_id = ANY($1::int[])
        AND (t.end_date IS NULL OR t.end_date >= CURRENT_DATE)
      ORDER BY u.name
      `,
      [roomIds]
    );

    const tenantsByRoom = new Map();
    for (const t of tenantsResult.rows) {
      const list = tenantsByRoom.get(t.room_id) || [];
      list.push({ id: t.tenant_id, name: t.name, email: t.email, phone: t.phone });
      tenantsByRoom.set(t.room_id, list);
    }

    const rooms = roomsResult.rows.map((r) => {
      const tenants = tenantsByRoom.get(r.room_id) || [];
      const lastReading = lastReadingByRoom.get(r.room_id) || null;
      return {
        roomId: r.room_id,
        roomNumber: r.room_number,
        floorNumber: Number.isFinite(Number(r.floor_number)) ? Number(r.floor_number) : 0,
        capacity: r.capacity,
        buildingId: r.building_id,
        buildingName: r.building_name,
        currentTenants: tenants,
        suggestedSharingCount: tenants.length || r.capacity || 1,
        lastReading: lastReading
          ? {
              id: lastReading.id,
              previousReading: Number(lastReading.previous_reading),
              currentReading: Number(lastReading.current_reading),
              unitsConsumed: Number(lastReading.units_consumed),
              ratePerUnit: Number(lastReading.rate_per_unit),
              totalAmount: Number(lastReading.total_amount),
              sharingCount: lastReading.sharing_count,
              perPersonAmount: Number(lastReading.per_person_amount),
              billingMonth: lastReading.billing_month,
              billingYear: lastReading.billing_year,
              billed: lastReading.billed,
              billedAt: lastReading.billed_at,
              createdAt: lastReading.created_at,
            }
          : null,
      };
    });

    res.json({ defaultRate, rooms });
  } catch (error) {
    console.error('[ENERGY] getRoomsForEnergy error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET /api/admin/energy/readings/:roomId
// History for a specific room (most recent first).
const getRoomReadings = async (req, res) => {
  try {
    await ensureEnergyOrgSchema(req.pool);

    const roomId = parseInt(req.params.roomId, 10);
    if (!Number.isInteger(roomId)) return res.status(400).json({ message: 'Invalid room id' });

    const result = await req.pool.query(
      `
      SELECT er.*, r.room_number, bl.name as building_name
      FROM electricity_readings er
      JOIN rooms r ON er.room_id = r.id
      LEFT JOIN buildings bl ON r.building_id = bl.id
      WHERE er.room_id = $1
      ORDER BY er.billing_year DESC, er.billing_month DESC, er.id DESC
      LIMIT 24
      `,
      [roomId]
    );

    res.json({
      readings: result.rows.map((r) => ({
        id: r.id,
        roomId: r.room_id,
        roomNumber: r.room_number,
        buildingName: r.building_name,
        previousReading: Number(r.previous_reading),
        currentReading: Number(r.current_reading),
        unitsConsumed: Number(r.units_consumed),
        ratePerUnit: Number(r.rate_per_unit),
        totalAmount: Number(r.total_amount),
        sharingCount: r.sharing_count,
        perPersonAmount: Number(r.per_person_amount),
        billingMonth: r.billing_month,
        billingYear: r.billing_year,
        billed: r.billed,
        billedAt: r.billed_at,
        notes: r.notes,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('[ENERGY] getRoomReadings error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// POST /api/admin/energy/readings
// Body: { roomId, currentReading, previousReading?, ratePerUnit?, sharingCount?,
//         billingMonth?, billingYear?, notes? }
const saveReading = async (req, res) => {
  await ensureEnergyOrgSchema(req.pool);

  const client = await req.pool.connect();
  try {
    const {
      roomId,
      currentReading,
      previousReading,
      sharingCount,
      billingMonth,
      billingYear,
      notes,
    } = req.body || {};

    const parsedRoom = parseInt(roomId, 10);
    if (!Number.isInteger(parsedRoom)) {
      return res.status(400).json({ message: 'roomId is required' });
    }

    const parsedCurrent = Number(currentReading);
    if (Number.isNaN(parsedCurrent) || parsedCurrent < 0) {
      return res.status(400).json({ message: 'currentReading must be a non-negative number' });
    }

    await client.query('BEGIN');

    // Validate the room exists in this org's schema.
    const roomCheck = await client.query(
      `SELECT r.id, r.capacity, r.room_number, bl.name as building_name
       FROM rooms r LEFT JOIN buildings bl ON r.building_id = bl.id
       WHERE r.id = $1`,
      [parsedRoom]
    );
    if (roomCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Room not found' });
    }
    const room = roomCheck.rows[0];

    // Auto-fetch previous reading from the latest record if admin didn't override.
    let parsedPrevious;
    if (previousReading !== undefined && previousReading !== null && previousReading !== '') {
      parsedPrevious = Number(previousReading);
      if (Number.isNaN(parsedPrevious) || parsedPrevious < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'previousReading must be a non-negative number' });
      }
    } else {
      const prev = await client.query(
        `SELECT current_reading FROM electricity_readings
         WHERE room_id = $1
         ORDER BY billing_year DESC, billing_month DESC, id DESC
         LIMIT 1`,
        [parsedRoom]
      );
      parsedPrevious = prev.rows[0] ? Number(prev.rows[0].current_reading) : 0;
    }

    if (parsedCurrent < parsedPrevious) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Current reading (${parsedCurrent}) is lower than previous reading (${parsedPrevious}).`,
      });
    }

    // Rate always comes from organization settings (not editable in Energy Calc).
    const org = await Organization.findById(req.orgId);
    const parsedRate = Number(org?.default_electricity_rate || 0) || 8;
    if (Number.isNaN(parsedRate) || parsedRate <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Set a valid default electricity rate in Organization Settings.' });
    }

    // Resolve sharing count (admin override -> count of currently allocated tenants).
    let parsedSharing;
    if (sharingCount !== undefined && sharingCount !== null && sharingCount !== '') {
      parsedSharing = parseInt(sharingCount, 10);
    } else {
      const tenantCount = await client.query(
        `SELECT COUNT(*)::int AS count
         FROM tenants t JOIN beds b ON t.bed_id = b.id
         WHERE b.room_id = $1
           AND (t.end_date IS NULL OR t.end_date >= CURRENT_DATE)`,
        [parsedRoom]
      );
      parsedSharing = tenantCount.rows[0]?.count || room.capacity || 1;
    }
    if (!Number.isInteger(parsedSharing) || parsedSharing <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'sharingCount must be a positive integer' });
    }

    const now = new Date();
    const month = parseInt(billingMonth, 10) || now.getMonth() + 1; // 1-12
    const year = parseInt(billingYear, 10) || now.getFullYear();

    const units = Number((parsedCurrent - parsedPrevious).toFixed(2));
    const total = Number((units * parsedRate).toFixed(2));
    const perPerson = Number((total / parsedSharing).toFixed(2));

    // Upsert: one reading per (room, month, year). Re-saving overwrites the
    // previous unbilled draft so admins can fix typos before billing.
    const upsert = await client.query(
      `
      INSERT INTO electricity_readings
        (room_id, previous_reading, current_reading, units_consumed,
         rate_per_unit, total_amount, sharing_count, per_person_amount,
         billing_month, billing_year, recorded_by, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (room_id, billing_month, billing_year) DO UPDATE
        SET previous_reading = EXCLUDED.previous_reading,
            current_reading = EXCLUDED.current_reading,
            units_consumed = EXCLUDED.units_consumed,
            rate_per_unit = EXCLUDED.rate_per_unit,
            total_amount = EXCLUDED.total_amount,
            sharing_count = EXCLUDED.sharing_count,
            per_person_amount = EXCLUDED.per_person_amount,
            recorded_by = EXCLUDED.recorded_by,
            notes = EXCLUDED.notes
        WHERE electricity_readings.billed = FALSE
      RETURNING *
      `,
      [
        parsedRoom,
        parsedPrevious,
        parsedCurrent,
        units,
        parsedRate,
        total,
        parsedSharing,
        perPerson,
        month,
        year,
        req.user?.id || null,
        notes || null,
      ]
    );

    if (upsert.rows.length === 0) {
      // Conflict existed but reading was already billed — refuse to overwrite.
      await client.query('ROLLBACK');
      return res.status(409).json({
        message: 'A billed reading already exists for this room and month. Choose a different month or undo first.',
      });
    }

    await client.query('COMMIT');

    await logRequestAudit(req, {
      action: 'ELECTRICITY_READING_SAVED',
      entityType: 'room',
      entityId: parsedRoom,
      details: {
        previousReading: parsedPrevious,
        currentReading: parsedCurrent,
        units,
        rate: parsedRate,
        total,
        sharing: parsedSharing,
        perPerson,
        month,
        year,
      },
    });

    const r = upsert.rows[0];
    res.json({
      message: 'Reading saved',
      reading: {
        id: r.id,
        roomId: r.room_id,
        roomNumber: room.room_number,
        buildingName: room.building_name,
        previousReading: Number(r.previous_reading),
        currentReading: Number(r.current_reading),
        unitsConsumed: Number(r.units_consumed),
        ratePerUnit: Number(r.rate_per_unit),
        totalAmount: Number(r.total_amount),
        sharingCount: r.sharing_count,
        perPersonAmount: Number(r.per_person_amount),
        billingMonth: r.billing_month,
        billingYear: r.billing_year,
        billed: r.billed,
      },
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_e) { /* ignore */ }
    console.error('[ENERGY] saveReading error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    client.release();
  }
};

// POST /api/admin/energy/bill-tenants/:readingId
// Body: { tenantIds?: number[], status?: 'pending' | 'completed', notify?: boolean }
// Creates one electricity payment per tenant for that reading and marks the
// reading as billed. If `tenantIds` is omitted, bills all currently allocated
// tenants in that room.
const billTenants = async (req, res) => {
  await ensureEnergyOrgSchema(req.pool);

  const client = await req.pool.connect();
  try {
    const readingId = parseInt(req.params.readingId, 10);
    if (!Number.isInteger(readingId)) {
      return res.status(400).json({ message: 'Invalid reading id' });
    }

    const { tenantIds, status, notify } = req.body || {};
    const billStatus = ALLOWED_BILLING_STATUS.has(status) ? status : 'pending';

    await client.query('BEGIN');

    const readingResult = await client.query(
      `SELECT er.*, r.room_number, bl.name as building_name
       FROM electricity_readings er
       JOIN rooms r ON er.room_id = r.id
       LEFT JOIN buildings bl ON r.building_id = bl.id
       WHERE er.id = $1`,
      [readingId]
    );
    if (readingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Reading not found' });
    }
    const reading = readingResult.rows[0];

    // Resolve which tenants to bill.
    let tenants;
    if (Array.isArray(tenantIds) && tenantIds.length > 0) {
      const ids = tenantIds.map((id) => parseInt(id, 10)).filter(Number.isInteger);
      const r = await client.query(
        `SELECT t.id, u.name, t.email, t.phone
         FROM tenants t
         JOIN users u ON t.user_id = u.id
         JOIN beds b ON t.bed_id = b.id
         WHERE t.id = ANY($1::int[]) AND b.room_id = $2`,
        [ids, reading.room_id]
      );
      tenants = r.rows;
    } else {
      const r = await client.query(
        `SELECT t.id, u.name, t.email, t.phone
         FROM tenants t
         JOIN users u ON t.user_id = u.id
         JOIN beds b ON t.bed_id = b.id
         WHERE b.room_id = $1
           AND (t.end_date IS NULL OR t.end_date >= CURRENT_DATE)`,
        [reading.room_id]
      );
      tenants = r.rows;
    }

    if (tenants.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'No tenants to bill in this room.' });
    }

    const perPerson = Number(reading.per_person_amount);
    const monthName = new Date(reading.billing_year, reading.billing_month - 1, 1).toLocaleString(
      'default',
      { month: 'long', year: 'numeric' }
    );
    const bedInfo = `${reading.building_name || ''} - Room ${reading.room_number}`.trim();

    const inserted = [];
    const skipped = [];
    const whatsappMessages = [];

    for (const t of tenants) {
      try {
        const ins = await client.query(
          `INSERT INTO payments
            (tenant_id, tenant_name, email, phone, amount, status,
             payment_month, payment_year, payment_type, reading_id, razorpay_payment_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'electricity',$9,$10)
           ON CONFLICT (tenant_id, payment_month, payment_year, payment_type) DO NOTHING
           RETURNING id`,
          [
            t.id,
            t.name,
            t.email,
            t.phone || null,
            perPerson,
            billStatus,
            reading.billing_month,
            reading.billing_year,
            reading.id,
            'ELEC_' + reading.id + '_' + Date.now(),
          ]
        );
        if (ins.rows.length > 0) {
          inserted.push({ tenantId: t.id, name: t.name, paymentId: ins.rows[0].id });
        } else {
          skipped.push({ tenantId: t.id, name: t.name, reason: 'Already billed for this month' });
        }

        if (notify && t.phone) {
          const built = whatsapp.buildElectricityBill({
            phone: t.phone,
            tenantName: t.name,
            monthName,
            units: Number(reading.units_consumed),
            perPersonAmount: perPerson,
            sharingCount: reading.sharing_count,
            bedInfo,
            orgName: req.orgName,
          });
          if (built.whatsappUrl) {
            whatsappMessages.push({ tenantId: t.id, name: t.name, whatsappUrl: built.whatsappUrl });
          }
        }
      } catch (err) {
        console.error(`[ENERGY] Failed to bill tenant ${t.id}:`, err.message);
        skipped.push({ tenantId: t.id, name: t.name, reason: err.message });
      }
    }

    await client.query(
      `UPDATE electricity_readings SET billed = TRUE, billed_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [reading.id]
    );

    await client.query('COMMIT');

    await logRequestAudit(req, {
      action: 'ELECTRICITY_BILLED',
      entityType: 'electricity_reading',
      entityId: reading.id,
      details: {
        roomId: reading.room_id,
        billed: inserted.length,
        skipped: skipped.length,
        status: billStatus,
        month: monthName,
      },
    });

    res.json({
      message: `Billed ${inserted.length} tenant(s) for ${monthName}`,
      inserted,
      skipped,
      whatsappMessages,
    });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_e) { /* ignore */ }
    console.error('[ENERGY] billTenants error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    client.release();
  }
};

module.exports = {
  getRoomsForEnergy,
  getRoomReadings,
  saveReading,
  billTenants,
};
