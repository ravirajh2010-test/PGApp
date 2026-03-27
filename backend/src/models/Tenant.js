const pool = require('../config/database');

class Tenant {
  static async create(userId, email, bedId, startDate, endDate, rent) {
    const query = 'INSERT INTO tenants (user_id, email, bed_id, start_date, end_date, rent) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
    const values = [userId, email, bedId, startDate, endDate, rent];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM tenants WHERE user_id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM tenants WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll() {
    const query = 'SELECT t.*, u.name, u.email, b.room_id, b.bed_identifier, r.room_number, r.building_id, bl.name as building_name FROM tenants t JOIN users u ON t.user_id = u.id JOIN beds b ON t.bed_id = b.id JOIN rooms r ON b.room_id = r.id JOIN buildings bl ON r.building_id = bl.id ORDER BY bl.name, r.room_number, b.bed_identifier';
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const query = `UPDATE tenants SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`;
    values.push(id);
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM tenants WHERE id = $1';
    await pool.query(query, [id]);
  }
}

module.exports = Tenant;