const pool = require('../config/database');

class Subscription {
  static async create(orgId, plan, amount, billingCycle = 'monthly') {
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const query = `INSERT INTO subscriptions (org_id, plan, amount, billing_cycle, current_period_start, current_period_end) 
                   VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const result = await pool.query(query, [orgId, plan, amount, billingCycle, now, periodEnd]);
    return result.rows[0];
  }

  static async findByOrgId(orgId) {
    const query = 'SELECT * FROM subscriptions WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1';
    const result = await pool.query(query, [orgId]);
    return result.rows[0];
  }

  static async findAll() {
    const query = `SELECT s.*, o.name as org_name, o.email as org_email 
                   FROM subscriptions s 
                   JOIN organizations o ON s.org_id = o.id 
                   ORDER BY s.created_at DESC`;
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const query = `UPDATE subscriptions SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${fields.length + 1} RETURNING *`;
    values.push(id);
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async cancel(id) {
    const query = "UPDATE subscriptions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *";
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = Subscription;
