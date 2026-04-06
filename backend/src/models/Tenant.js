/**
 * Tenant model - all methods accept org pool as first parameter.
 * No org_id filtering needed since each org has its own database.
 */
class Tenant {
  static async create(pool, userId, email, bedId, startDate, endDate, rent, phone) {
    const query = 'INSERT INTO tenants (user_id, email, bed_id, start_date, end_date, rent, phone) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
    const values = [userId, email, bedId, startDate, endDate, rent, phone || null];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByUserId(pool, userId) {
    const result = await pool.query('SELECT * FROM tenants WHERE user_id = $1', [userId]);
    return result.rows[0];
  }

  static async findById(pool, id) {
    const result = await pool.query('SELECT * FROM tenants WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findAll(pool) {
    const query = `SELECT t.*, u.name, u.email, b.room_id, b.bed_identifier, r.room_number, r.building_id, bl.name as building_name 
      FROM tenants t 
      JOIN users u ON t.user_id = u.id 
      JOIN beds b ON t.bed_id = b.id 
      JOIN rooms r ON b.room_id = r.id 
      JOIN buildings bl ON r.building_id = bl.id 
      ORDER BY bl.name, r.room_number, b.bed_identifier`;
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(pool, id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const query = `UPDATE tenants SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`;
    const result = await pool.query(query, [...values, id]);
    return result.rows[0];
  }

  static async delete(pool, id) {
    await pool.query('DELETE FROM tenants WHERE id = $1', [id]);
  }
}

module.exports = Tenant;