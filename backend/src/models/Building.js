/**
 * Building model - all methods accept org pool as first parameter.
 * No org_id filtering needed since each org has its own database.
 */
class Building {
  static async findAll(pool) {
    const result = await pool.query('SELECT * FROM buildings ORDER BY id');
    return result.rows;
  }

  static async findById(pool, id) {
    const result = await pool.query('SELECT * FROM buildings WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async create(pool, name, location) {
    const result = await pool.query('INSERT INTO buildings (name, location) VALUES ($1, $2) RETURNING *', [name, location]);
    return result.rows[0];
  }

  static async update(pool, id, name, location) {
    const result = await pool.query('UPDATE buildings SET name = $1, location = $2 WHERE id = $3 RETURNING *', [name, location, id]);
    return result.rows[0];
  }

  static async delete(pool, id) {
    const check = await pool.query('SELECT id FROM buildings WHERE id = $1', [id]);
    if (check.rows.length === 0) return null;

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

    const result = await pool.query('DELETE FROM buildings WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }
}

module.exports = Building;