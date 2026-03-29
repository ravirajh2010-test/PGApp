const pool = require('../config/database');

class Invoice {
  static async create(orgId, subscriptionId, amount, description, dueDate) {
    const query = `INSERT INTO invoices (org_id, subscription_id, amount, description, due_date) 
                   VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const result = await pool.query(query, [orgId, subscriptionId, amount, description, dueDate]);
    return result.rows[0];
  }

  static async findByOrgId(orgId) {
    const query = 'SELECT * FROM invoices WHERE org_id = $1 ORDER BY invoice_date DESC';
    const result = await pool.query(query, [orgId]);
    return result.rows;
  }

  static async findAll() {
    const query = `SELECT i.*, o.name as org_name 
                   FROM invoices i 
                   JOIN organizations o ON i.org_id = o.id 
                   ORDER BY i.invoice_date DESC`;
    const result = await pool.query(query);
    return result.rows;
  }

  static async markPaid(id, razorpayPaymentId) {
    const query = `UPDATE invoices SET status = 'paid', paid_at = CURRENT_TIMESTAMP, razorpay_payment_id = $1 WHERE id = $2 RETURNING *`;
    const result = await pool.query(query, [razorpayPaymentId, id]);
    return result.rows[0];
  }

  static async updateStatus(id, status) {
    const query = 'UPDATE invoices SET status = $1 WHERE id = $2 RETURNING *';
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }
}

module.exports = Invoice;
