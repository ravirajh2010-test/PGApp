const pool = require('../config/database');

class Bed {
  static async findAll() {
    const query = 'SELECT * FROM beds ORDER BY id';
    const result = await pool.query(query);
    return result.rows;
  }

  static async findByRoom(roomId) {
    const query = 'SELECT * FROM beds WHERE room_id = $1 ORDER BY id';
    const result = await pool.query(query, [roomId]);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM beds WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findVacantByRoom(roomId) {
    const query = 'SELECT * FROM beds WHERE room_id = $1 AND status = $2';
    const result = await pool.query(query, [roomId, 'vacant']);
    return result.rows;
  }

  static async create(roomId, bedIdentifier, status = 'vacant') {
    const query = 'INSERT INTO beds (room_id, bed_identifier, status) VALUES ($1, $2, $3) RETURNING *';
    const result = await pool.query(query, [roomId, bedIdentifier, status]);
    return result.rows[0];
  }

  static async update(id, roomId, bedIdentifier, status) {
    const query = 'UPDATE beds SET room_id = $1, bed_identifier = $2, status = $3 WHERE id = $4 RETURNING *';
    const result = await pool.query(query, [roomId, bedIdentifier, status, id]);
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const query = 'UPDATE beds SET status = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async delete(id) {
    // Cascading delete: delete in correct order to avoid foreign key violations
    // 1. Get tenants in this bed
    const tenantResult = await pool.query('SELECT id, user_id FROM tenants WHERE bed_id = $1', [id]);
    
    // 2. Delete payments for these tenants first
    for (const tenant of tenantResult.rows) {
      await pool.query('DELETE FROM payments WHERE tenant_id = $1', [tenant.id]);
    }
    
    // 3. Delete tenants
    await pool.query('DELETE FROM tenants WHERE bed_id = $1', [id]);

    // 4. Delete associated users
    for (const tenant of tenantResult.rows) {
      await pool.query('DELETE FROM users WHERE id = $1', [tenant.user_id]);
    }

    // 5. Finally delete the bed
    const query = 'DELETE FROM beds WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Bed;