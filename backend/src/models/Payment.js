/**
 * Payment model - all methods accept org pool as first parameter.
 * No org_id filtering needed since each org has its own database.
 */
class Payment {
  static async create(pool, { tenantId, tenantName, email, phone, amount, status, paymentMonth, paymentYear, razorpayPaymentId }) {
    const query = `INSERT INTO payments (tenant_id, tenant_name, email, phone, amount, status, payment_month, payment_year, razorpay_payment_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
    const result = await pool.query(query, [tenantId, tenantName, email, phone, amount, status, paymentMonth, paymentYear, razorpayPaymentId]);
    return result.rows[0];
  }

  static async findByTenantId(pool, tenantId) {
    const result = await pool.query('SELECT * FROM payments WHERE tenant_id = $1 ORDER BY payment_year DESC, payment_month DESC', [tenantId]);
    return result.rows;
  }

  static async findByMonth(pool, month, year) {
    const result = await pool.query('SELECT * FROM payments WHERE payment_month = $1 AND payment_year = $2 ORDER BY tenant_name', [month, year]);
    return result.rows;
  }

  static async findExisting(pool, tenantId, month, year) {
    const result = await pool.query(
      `SELECT id FROM payments WHERE tenant_id = $1 AND payment_month = $2 AND payment_year = $3 AND status = 'completed'`,
      [tenantId, month, year]
    );
    return result.rows[0] || null;
  }

  static async findAll(pool) {
    const result = await pool.query('SELECT * FROM payments ORDER BY payment_year DESC, payment_month DESC, payment_date DESC');
    return result.rows;
  }

  static async updateStatus(pool, id, status) {
    const result = await pool.query('UPDATE payments SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    return result.rows[0];
  }
}

module.exports = Payment;