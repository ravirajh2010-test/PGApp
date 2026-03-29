const pool = require('../config/database');

class Organization {
  static async create(name, slug, email, phone, address, plan = 'free') {
    const query = `INSERT INTO organizations (name, slug, email, phone, address, plan) 
                   VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const result = await pool.query(query, [name, slug, email, phone, address, plan]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM organizations WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findBySlug(slug) {
    const query = 'SELECT * FROM organizations WHERE slug = $1';
    const result = await pool.query(query, [slug]);
    return result.rows[0];
  }

  static async findAll() {
    const query = 'SELECT * FROM organizations ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const query = `UPDATE organizations SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fields.length + 1} RETURNING *`;
    values.push(id);
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updatePlan(id, plan) {
    const limitsResult = await pool.query('SELECT * FROM plan_limits WHERE plan = $1', [plan]);
    if (limitsResult.rows.length === 0) throw new Error('Invalid plan');
    const limits = limitsResult.rows[0];

    const query = `UPDATE organizations SET plan = $1, max_properties = $2, max_beds = $3, max_users = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *`;
    const result = await pool.query(query, [plan, limits.max_properties, limits.max_beds, limits.max_users, id]);
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const query = 'UPDATE organizations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM organizations WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getStats(id) {
    const stats = {};
    const buildingCount = await pool.query('SELECT COUNT(*) as count FROM buildings WHERE org_id = $1', [id]);
    const bedCount = await pool.query('SELECT COUNT(*) as count FROM beds WHERE org_id = $1', [id]);
    const occupiedCount = await pool.query("SELECT COUNT(*) as count FROM beds WHERE org_id = $1 AND status = 'occupied'", [id]);
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users WHERE org_id = $1', [id]);
    const tenantCount = await pool.query('SELECT COUNT(*) as count FROM tenants WHERE org_id = $1', [id]);

    stats.buildings = parseInt(buildingCount.rows[0].count);
    stats.totalBeds = parseInt(bedCount.rows[0].count);
    stats.occupiedBeds = parseInt(occupiedCount.rows[0].count);
    stats.vacantBeds = stats.totalBeds - stats.occupiedBeds;
    stats.users = parseInt(userCount.rows[0].count);
    stats.tenants = parseInt(tenantCount.rows[0].count);
    stats.occupancyRate = stats.totalBeds > 0 ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100) : 0;
    return stats;
  }

  static async getPlanLimits(plan) {
    const query = 'SELECT * FROM plan_limits WHERE plan = $1';
    const result = await pool.query(query, [plan]);
    return result.rows[0];
  }

  static async getAllPlanLimits() {
    const query = 'SELECT * FROM plan_limits ORDER BY price_monthly';
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = Organization;
