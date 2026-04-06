/**
 * Room model - all methods accept org pool as first parameter.
 * No org_id filtering needed since each org has its own database.
 */
class Room {
  static async findAll(pool) {
    const result = await pool.query('SELECT * FROM rooms ORDER BY id');
    return result.rows;
  }

  static async findByBuilding(pool, buildingId) {
    const result = await pool.query('SELECT * FROM rooms WHERE building_id = $1 ORDER BY room_number', [buildingId]);
    return result.rows;
  }

  static async findById(pool, id) {
    const result = await pool.query('SELECT * FROM rooms WHERE id = $1', [id]);
    return result.rows[0];
  }

  static extractFloorFromRoomNumber(roomNumber) {
    const numStr = String(roomNumber).padStart(3, '0');
    const firstDigit = parseInt(numStr[0]);
    return firstDigit === 0 ? 0 : firstDigit;
  }

  static async create(pool, buildingId, roomNumber, capacity, floorNumber = null) {
    const floor = floorNumber !== null ? floorNumber : this.extractFloorFromRoomNumber(roomNumber);
    const result = await pool.query(
      'INSERT INTO rooms (building_id, room_number, capacity, floor_number) VALUES ($1, $2, $3, $4) RETURNING *',
      [buildingId, roomNumber, capacity, floor]
    );
    return result.rows[0];
  }

  static async update(pool, id, buildingId, roomNumber, capacity, floorNumber = null) {
    const floor = floorNumber !== null ? floorNumber : this.extractFloorFromRoomNumber(roomNumber);
    const result = await pool.query(
      'UPDATE rooms SET building_id = $1, room_number = $2, capacity = $3, floor_number = $4 WHERE id = $5 RETURNING *',
      [buildingId, roomNumber, capacity, floor, id]
    );
    return result.rows[0];
  }

  static async delete(pool, id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const check = await client.query('SELECT id FROM rooms WHERE id = $1', [id]);
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

      const result = await client.query('DELETE FROM rooms WHERE id = $1 RETURNING *', [id]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async getFloorLayout(pool, buildingId) {
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
      WHERE r.building_id = $1
      GROUP BY r.floor_number, r.id, r.room_number, r.capacity
      ORDER BY r.floor_number ASC, r.room_number ASC
    `;
    const result = await pool.query(query, [buildingId]);
    
    const floorMap = {};
    result.rows.forEach(room => {
      const floor = room.floor_number;
      if (!floorMap[floor]) {
        floorMap[floor] = [];
      }
      floorMap[floor].push(room);
    });
    
    return Object.entries(floorMap).map(([floor, rooms]) => ({
      floor_number: parseInt(floor),
      rooms
    }));
  }

  static async getFloorLayoutWithBeds(pool, buildingId) {
    const query = `
      SELECT 
        r.floor_number,
        r.id as room_id,
        r.room_number,
        r.capacity,
        b.id as bed_id,
        b.bed_identifier,
        b.status as bed_status,
        u.name as tenant_name
      FROM rooms r
      LEFT JOIN beds b ON r.id = b.room_id
      LEFT JOIN tenants t ON b.id = t.bed_id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE r.building_id = $1
      ORDER BY r.floor_number ASC, r.room_number ASC, b.bed_identifier ASC
    `;
    const result = await pool.query(query, [buildingId]);

    const floorMap = {};
    result.rows.forEach(row => {
      const floor = row.floor_number;
      if (!floorMap[floor]) floorMap[floor] = {};
      if (!floorMap[floor][row.room_id]) {
        floorMap[floor][row.room_id] = {
          room_id: row.room_id,
          room_number: row.room_number,
          capacity: row.capacity,
          beds: []
        };
      }
      if (row.bed_id) {
        floorMap[floor][row.room_id].beds.push({
          id: row.bed_id,
          bed_identifier: row.bed_identifier,
          status: row.bed_status,
          tenant_name: row.tenant_name
        });
      }
    });

    return Object.entries(floorMap)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([floor, roomsObj]) => ({
        floor_number: parseInt(floor),
        rooms: Object.values(roomsObj)
      }));
  }
}

module.exports = Room;