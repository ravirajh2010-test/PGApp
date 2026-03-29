const pool = require('../config/database');

class Room {
  static async findAll(orgId) {
    const query = 'SELECT * FROM rooms WHERE org_id = $1 ORDER BY id';
    const result = await pool.query(query, [orgId]);
    return result.rows;
  }

  static async findByBuilding(buildingId, orgId) {
    const query = 'SELECT * FROM rooms WHERE building_id = $1 AND org_id = $2 ORDER BY room_number';
    const result = await pool.query(query, [buildingId, orgId]);
    return result.rows;
  }

  static async findById(id, orgId) {
    const query = 'SELECT * FROM rooms WHERE id = $1 AND org_id = $2';
    const result = await pool.query(query, [id, orgId]);
    return result.rows[0];
  }

  static extractFloorFromRoomNumber(roomNumber) {
    const numStr = String(roomNumber).padStart(3, '0');
    const firstDigit = parseInt(numStr[0]);
    return firstDigit === 0 ? 0 : firstDigit;
  }

  static async create(buildingId, roomNumber, capacity, orgId, floorNumber = null) {
    const floor = floorNumber !== null ? floorNumber : this.extractFloorFromRoomNumber(roomNumber);
    const query = 'INSERT INTO rooms (building_id, room_number, capacity, org_id, floor_number) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const result = await pool.query(query, [buildingId, roomNumber, capacity, orgId, floor]);
    return result.rows[0];
  }

  static async update(id, buildingId, roomNumber, capacity, orgId, floorNumber = null) {
    const floor = floorNumber !== null ? floorNumber : this.extractFloorFromRoomNumber(roomNumber);
    const query = 'UPDATE rooms SET building_id = $1, room_number = $2, capacity = $3, floor_number = $4 WHERE id = $5 AND org_id = $6 RETURNING *';
    const result = await pool.query(query, [buildingId, roomNumber, capacity, floor, id, orgId]);
    return result.rows[0];
  }

  static async delete(id, orgId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verify ownership
      const check = await client.query('SELECT id FROM rooms WHERE id = $1 AND org_id = $2', [id, orgId]);
      if (check.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const userIdsResult = await client.query(`
        SELECT DISTINCT t.user_id FROM tenants t
        WHERE t.bed_id IN (SELECT b.id FROM beds b WHERE b.room_id = $1)
      `, [id]);
      const userIds = userIdsResult.rows.map(r => r.user_id);

      await client.query(`
        DELETE FROM payments WHERE tenant_id IN (
          SELECT t.id FROM tenants t
          WHERE t.bed_id IN (SELECT b.id FROM beds b WHERE b.room_id = $1)
        )
      `, [id]);

      await client.query(`
        DELETE FROM tenants WHERE bed_id IN (
          SELECT id FROM beds WHERE room_id = $1
        )
      `, [id]);

      if (userIds.length > 0) {
        await client.query("DELETE FROM users WHERE id = ANY($1) AND role = 'tenant'", [userIds]);
      }

      await client.query('DELETE FROM beds WHERE room_id = $1', [id]);

      const result = await client.query('DELETE FROM rooms WHERE id = $1 AND org_id = $2 RETURNING *', [id, orgId]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getFloorLayout(buildingId, orgId) {
    const query = `
      SELECT 
        r.floor_number,
        r.id,
        r.room_number,
        r.capacity,
        COUNT(b.id) as total_beds,
        COUNT(CASE WHEN b.status = 'occupied' THEN 1 END) as occupied_beds,
        COUNT(CASE WHEN b.status = 'vacant' THEN 1 END) as vacant_beds
      FROM rooms r
      LEFT JOIN beds b ON r.id = b.room_id
      WHERE r.building_id = $1 AND r.org_id = $2
      GROUP BY r.floor_number, r.id, r.room_number, r.capacity
      ORDER BY r.floor_number ASC, r.room_number ASC
    `;
    const result = await pool.query(query, [buildingId, orgId]);
    
    // Group by floor
    const floorMap = {};
    result.rows.forEach(room => {
      const floor = room.floor_number;
      if (!floorMap[floor]) {
        floorMap[floor] = [];
      }
      floorMap[floor].push(room);
    });
    
    // Convert to array format
    return Object.entries(floorMap).map(([floor, rooms]) => ({
      floor_number: parseInt(floor),
      rooms
    }));
  }
}

module.exports = Room;