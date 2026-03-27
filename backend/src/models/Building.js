const pool = require('../config/database');

class Building {
  static async findAll() {
    const query = 'SELECT * FROM buildings ORDER BY id';
    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM buildings WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async create(name, location) {
    const query = 'INSERT INTO buildings (name, location) VALUES ($1, $2) RETURNING *';
    const result = await pool.query(query, [name, location]);
    return result.rows[0];
  }

  static async update(id, name, location) {
    const query = 'UPDATE buildings SET name = $1, location = $2 WHERE id = $3 RETURNING *';
    const result = await pool.query(query, [name, location, id]);
    return result.rows[0];
  }

  static async delete(id) {
    // Cascading delete: delete in correct order to avoid foreign key violations
    // 1. Delete payments first
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

    // 2. Delete tenants/users associated with beds in rooms of this building
    await pool.query(`
      DELETE FROM tenants WHERE bed_id IN (
        SELECT b.id FROM beds b
        JOIN rooms r ON b.room_id = r.id
        WHERE r.building_id = $1
      )
    `, [id]);

    // 3. Delete all users associated with those tenants
    await pool.query(`
      DELETE FROM users WHERE id IN (
        SELECT t.user_id FROM tenants t
        WHERE t.bed_id IN (
          SELECT b.id FROM beds b
          JOIN rooms r ON b.room_id = r.id
          WHERE r.building_id = $1
        )
      )
    `, [id]);

    // 4. Delete all beds in rooms of this building
    await pool.query(`
      DELETE FROM beds WHERE room_id IN (
        SELECT id FROM rooms WHERE building_id = $1
      )
    `, [id]);

    // 5. Delete all rooms in this building
    await pool.query('DELETE FROM rooms WHERE building_id = $1', [id]);

    // 6. Finally delete the building
    const query = 'DELETE FROM buildings WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Building;