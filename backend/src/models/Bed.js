const pool = require('../config/database');

class Bed {
  static async findAll(orgId) {
    const query = 'SELECT * FROM beds WHERE org_id = $1 ORDER BY id';
    const result = await pool.query(query, [orgId]);
    return result.rows;
  }

  static async findByRoom(roomId, orgId) {
    const query = 'SELECT * FROM beds WHERE room_id = $1 AND org_id = $2 ORDER BY id';
    const result = await pool.query(query, [roomId, orgId]);
    return result.rows;
  }

  static async findById(id, orgId) {
    const query = orgId 
      ? 'SELECT * FROM beds WHERE id = $1 AND org_id = $2'
      : 'SELECT * FROM beds WHERE id = $1';
    const params = orgId ? [id, orgId] : [id];
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  static async findVacantByRoom(roomId, orgId) {
    const query = 'SELECT * FROM beds WHERE room_id = $1 AND status = $2 AND org_id = $3';
    const result = await pool.query(query, [roomId, 'vacant', orgId]);
    return result.rows;
  }

  static async create(roomId, bedIdentifier, status = 'vacant', orgId) {
    const query = 'INSERT INTO beds (room_id, bed_identifier, status, org_id) VALUES ($1, $2, $3, $4) RETURNING *';
    const result = await pool.query(query, [roomId, bedIdentifier, status, orgId]);
    return result.rows[0];
  }

  static async update(id, roomId, bedIdentifier, status, orgId) {
    const query = 'UPDATE beds SET room_id = $1, bed_identifier = $2, status = $3 WHERE id = $4 AND org_id = $5 RETURNING *';
    const result = await pool.query(query, [roomId, bedIdentifier, status, id, orgId]);
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const query = 'UPDATE beds SET status = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async delete(id, orgId) {
    // Verify ownership
    const check = await pool.query('SELECT id FROM beds WHERE id = $1 AND org_id = $2', [id, orgId]);
    if (check.rows.length === 0) return null;

    const tenantResult = await pool.query('SELECT id, user_id FROM tenants WHERE bed_id = $1', [id]);
    
    for (const tenant of tenantResult.rows) {
      await pool.query('DELETE FROM payments WHERE tenant_id = $1', [tenant.id]);
    }
    
    await pool.query('DELETE FROM tenants WHERE bed_id = $1', [id]);

    for (const tenant of tenantResult.rows) {
      await pool.query("DELETE FROM users WHERE id = $1 AND role = 'tenant'", [tenant.user_id]);
    }

    const query = 'DELETE FROM beds WHERE id = $1 AND org_id = $2 RETURNING *';
    const result = await pool.query(query, [id, orgId]);
    return result.rows[0];
  }
}

module.exports = Bed;