const pool = require('../config/database');

class Payment {
  static async create(tenantId, amount, status, razorpayPaymentId, orgId) {
    const query = 'INSERT INTO payments (tenant_id, amount, status, razorpay_payment_id, org_id) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const values = [tenantId, amount, status, razorpayPaymentId, orgId];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByTenantId(tenantId) {
    const query = 'SELECT * FROM payments WHERE tenant_id = $1 ORDER BY payment_date DESC';
    const result = await pool.query(query, [tenantId]);
    return result.rows;
  }

  static async findByOrgId(orgId) {
    const query = 'SELECT * FROM payments WHERE org_id = $1 ORDER BY payment_date DESC';
    const result = await pool.query(query, [orgId]);
    return result.rows;
  }

  static async updateStatus(id, status) {
    const query = 'UPDATE payments SET status = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }
}

module.exports = Payment;