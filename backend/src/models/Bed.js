/**
 * Bed model - all methods accept org pool as first parameter.
 * No org_id filtering needed since each org has its own database.
 */
class Bed {
  static async findAll(pool) {
    const result = await pool.query('SELECT * FROM beds ORDER BY id');
    return result.rows;
  }

  static async findByRoom(pool, roomId) {
    const result = await pool.query('SELECT * FROM beds WHERE room_id = $1 ORDER BY id', [roomId]);
    return result.rows;
  }

  static async findById(pool, id) {
    const result = await pool.query('SELECT * FROM beds WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findVacantByRoom(pool, roomId) {
    const result = await pool.query("SELECT * FROM beds WHERE room_id = $1 AND status = 'vacant'", [roomId]);
    return result.rows;
  }

  static async create(pool, roomId, bedIdentifier, status = 'vacant') {
    const result = await pool.query(
      'INSERT INTO beds (room_id, bed_identifier, status) VALUES ($1, $2, $3) RETURNING *',
      [roomId, bedIdentifier, status]
    );
    return result.rows[0];
  }

  static async update(pool, id, roomId, bedIdentifier, status) {
    const result = await pool.query(
      'UPDATE beds SET room_id = $1, bed_identifier = $2, status = $3 WHERE id = $4 RETURNING *',
      [roomId, bedIdentifier, status, id]
    );
    return result.rows[0];
  }

  static async updateStatus(pool, id, status) {
    const result = await pool.query('UPDATE beds SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    return result.rows[0];
  }

  static async delete(pool, id) {
    const check = await pool.query('SELECT id FROM beds WHERE id = $1', [id]);
    if (check.rows.length === 0) return null;

    const tenantResult = await pool.query('SELECT id, user_id FROM tenants WHERE bed_id = $1', [id]);
    
    for (const tenant of tenantResult.rows) {
      await pool.query('DELETE FROM payments WHERE tenant_id = $1', [tenant.id]);
    }
    
    await pool.query('DELETE FROM tenants WHERE bed_id = $1', [id]);

    for (const tenant of tenantResult.rows) {
      await pool.query("DELETE FROM users WHERE id = $1 AND role = 'tenant'", [tenant.user_id]);
    }

    const result = await pool.query('DELETE FROM beds WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
}

module.exports = Bed;