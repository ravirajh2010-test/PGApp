const pool = require('../config/database');
const dbManager = require('../services/DatabaseManager');

/**
 * Organization model - uses master pool since organizations table lives in master DB.
 * getStats uses org-specific pools via DatabaseManager.
 */
class Organization {
  static async create(name, slug, email, phone, address, plan = 'free') {
    const query = `INSERT INTO organizations (name, slug, email, phone, address, plan) 
                   VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const result = await pool.query(query, [name, slug, email, phone, address, plan]);
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM organizations WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async findBySlug(slug) {
    const result = await pool.query('SELECT * FROM organizations WHERE slug = $1', [slug]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await pool.query('SELECT * FROM organizations WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async findAll() {
    const result = await pool.query('SELECT * FROM organizations ORDER BY created_at DESC');
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
    const result = await pool.query('UPDATE organizations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [status, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query('DELETE FROM organizations WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  static async getStats(id) {
    const stats = {};
    try {
      const orgPool = await dbManager.getOrgPool(id);
      const buildingCount = await orgPool.query('SELECT COUNT(*) as count FROM buildings');
      const bedCount = await orgPool.query('SELECT COUNT(*) as count FROM beds');
      const occupiedCount = await orgPool.query("SELECT COUNT(*) as count FROM beds WHERE status = 'occupied'");
      const roomCount = await orgPool.query('SELECT COUNT(*) as count FROM rooms');
      const userCount = await orgPool.query('SELECT COUNT(*) as count FROM users');
      const tenantCount = await orgPool.query('SELECT COUNT(*) as count FROM tenants');

      stats.buildings = parseInt(buildingCount.rows[0].count);
      stats.rooms = parseInt(roomCount.rows[0].count);
      stats.totalBeds = parseInt(bedCount.rows[0].count);
      stats.occupiedBeds = parseInt(occupiedCount.rows[0].count);
      stats.vacantBeds = stats.totalBeds - stats.occupiedBeds;
      stats.users = parseInt(userCount.rows[0].count);
      stats.tenants = parseInt(tenantCount.rows[0].count);
      stats.occupancyRate = stats.totalBeds > 0 ? Math.round((stats.occupiedBeds / stats.totalBeds) * 100) : 0;
    } catch (err) {
      console.error(`[ORG] Failed to get stats for org ${id}:`, err.message);
      stats.buildings = 0;
      stats.rooms = 0;
      stats.totalBeds = 0;
      stats.occupiedBeds = 0;
      stats.vacantBeds = 0;
      stats.users = 0;
      stats.tenants = 0;
      stats.occupancyRate = 0;
    }
    return stats;
  }

  static async getPlanLimits(plan) {
    const result = await pool.query('SELECT * FROM plan_limits WHERE plan = $1', [plan]);
    return result.rows[0];
  }

  static async getAllPlanLimits() {
    const result = await pool.query('SELECT * FROM plan_limits ORDER BY price_monthly');
    return result.rows;
  }
}

module.exports = Organization;
