const pool = require('../config/database');

class Room {
  static async findAll() {
    const query = 'SELECT * FROM rooms ORDER BY id';
    const result = await pool.query(query);
    return result.rows;
  }

  static async findByBuilding(buildingId) {
    const query = 'SELECT * FROM rooms WHERE building_id = $1 ORDER BY room_number';
    const result = await pool.query(query, [buildingId]);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM rooms WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create(buildingId, roomNumber, capacity) {
    const query = 'INSERT INTO rooms (building_id, room_number, capacity) VALUES ($1, $2, $3) RETURNING *';
    const result = await pool.query(query, [buildingId, roomNumber, capacity]);
    return result.rows[0];
  }

  static async update(id, buildingId, roomNumber, capacity) {
    const query = 'UPDATE rooms SET building_id = $1, room_number = $2, capacity = $3 WHERE id = $4 RETURNING *';
    const result = await pool.query(query, [buildingId, roomNumber, capacity, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Collect user_ids BEFORE deleting tenants (so the subquery still works)
      const userIdsResult = await client.query(`
        SELECT DISTINCT t.user_id FROM tenants t
        WHERE t.bed_id IN (SELECT b.id FROM beds b WHERE b.room_id = $1)
      `, [id]);
      const userIds = userIdsResult.rows.map(r => r.user_id);

      // 2. Delete payments for all tenants in beds of this room
      await client.query(`
        DELETE FROM payments WHERE tenant_id IN (
          SELECT t.id FROM tenants t
          WHERE t.bed_id IN (SELECT b.id FROM beds b WHERE b.room_id = $1)
        )
      `, [id]);

      // 3. Delete tenants associated with beds in this room
      await client.query(`
        DELETE FROM tenants WHERE bed_id IN (
          SELECT id FROM beds WHERE room_id = $1
        )
      `, [id]);

      // 4. Delete associated tenant users (now safe since tenants are removed)
      if (userIds.length > 0) {
        await client.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
      }

      // 5. Delete all beds in this room
      await client.query('DELETE FROM beds WHERE room_id = $1', [id]);

      // 6. Finally delete the room
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
}

module.exports = Room;