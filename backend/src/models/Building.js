const pool = require('../config/database');

class Building {
  static async findAll(orgId) {
    const query = 'SELECT * FROM buildings WHERE org_id = $1 ORDER BY id';
    const result = await pool.query(query, [orgId]);
    return result.rows;
  }

  static async findById(id, orgId) {
    const query = 'SELECT * FROM buildings WHERE id = $1 AND org_id = $2';
    const result = await pool.query(query, [id, orgId]);
    return result.rows[0];
  }

  static async create(name, location, orgId) {
    const query = 'INSERT INTO buildings (name, location, org_id) VALUES ($1, $2, $3) RETURNING *';
    const result = await pool.query(query, [name, location, orgId]);
    return result.rows[0];
  }

  static async update(id, name, location, orgId) {
    const query = 'UPDATE buildings SET name = $1, location = $2 WHERE id = $3 AND org_id = $4 RETURNING *';
    const result = await pool.query(query, [name, location, id, orgId]);
    return result.rows[0];
  }

  static async delete(id, orgId) {
    // Verify ownership
    const check = await pool.query('SELECT id FROM buildings WHERE id = $1 AND org_id = $2', [id, orgId]);
    if (check.rows.length === 0) return null;

    // Cascading delete: delete in correct order to avoid foreign key violations
    await pool.query(`
      DELETE FROM payments WHERE tenant_id IN (
        SELECT t.id FROM tenants t
        WHERE t.bed_id IN (
          SELECT b.id FROM beds b
          JOIN rooms r ON b.room_id = r.id
          WHERE r.building_id = $1
        )
      )
    `, [id]);

    await pool.query(`
      DELETE FROM tenants WHERE bed_id IN (
        SELECT b.id FROM beds b
        JOIN rooms r ON b.room_id = r.id
        WHERE r.building_id = $1
      )
    `, [id]);

    await pool.query(`
      DELETE FROM users WHERE id IN (
        SELECT t.user_id FROM tenants t
        WHERE t.bed_id IN (
          SELECT b.id FROM beds b
          JOIN rooms r ON b.room_id = r.id
          WHERE r.building_id = $1
        )
      ) AND role = 'tenant'
    `, [id]);

    await pool.query(`
      DELETE FROM beds WHERE room_id IN (
        SELECT id FROM rooms WHERE building_id = $1
      )
    `, [id]);

    await pool.query('DELETE FROM rooms WHERE building_id = $1', [id]);

    const query = 'DELETE FROM buildings WHERE id = $1 AND org_id = $2 RETURNING *';
    const result = await pool.query(query, [id, orgId]);
    return result.rows[0];
  }
}

module.exports = Building;