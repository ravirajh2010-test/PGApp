const pool = require('../config/database');

class Tenant {
  static async create(userId, email, bedId, startDate, endDate, rent, orgId, phone) {
    const query = 'INSERT INTO tenants (user_id, email, bed_id, start_date, end_date, rent, org_id, phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *';
    const values = [userId, email, bedId, startDate, endDate, rent, orgId, phone || null];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM tenants WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async findById(id, orgId) {
    const query = orgId
      ? 'SELECT * FROM tenants WHERE id = $1 AND org_id = $2'
      : 'SELECT * FROM tenants WHERE id = $1';
    const params = orgId ? [id, orgId] : [id];
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  static async findAll(orgId) {
    const query = `SELECT t.*, u.name, u.email, b.room_id, b.bed_identifier, r.room_number, r.building_id, bl.name as building_name 
      FROM tenants t 
      JOIN users u ON t.user_id = u.id 
      JOIN beds b ON t.bed_id = b.id 
      JOIN rooms r ON b.room_id = r.id 
      JOIN buildings bl ON r.building_id = bl.id 
      WHERE t.org_id = $1 
      ORDER BY bl.name, r.room_number, b.bed_identifier`;
    const result = await pool.query(query, [orgId]);
    return result.rows;
  }

  static async update(id, updates, orgId) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    let query, queryValues;
    if (orgId) {
      query = `UPDATE tenants SET ${setClause} WHERE id = $${fields.length + 1} AND org_id = $${fields.length + 2} RETURNING *`;
      queryValues = [...values, id, orgId];
    } else {
      query = `UPDATE tenants SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`;
      queryValues = [...values, id];
    }
    const result = await pool.query(query, queryValues);
    return result.rows[0];
  }

  static async delete(id, orgId) {
    const query = orgId
      ? 'DELETE FROM tenants WHERE id = $1 AND org_id = $2'
      : 'DELETE FROM tenants WHERE id = $1';
    const params = orgId ? [id, orgId] : [id];
    await pool.query(query, params);
  }
}

module.exports = Tenant;