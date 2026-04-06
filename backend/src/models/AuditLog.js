/**
 * AuditLog model - all methods accept org pool as first parameter.
 * No org_id filtering needed since each org has its own database.
 */
class AuditLog {
  static async create(pool, userId, action, entityType, entityId, details, ipAddress) {
    const query = `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) 
                   VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const result = await pool.query(query, [userId, action, entityType, entityId, details ? JSON.stringify(details) : null, ipAddress]);
    return result.rows[0];
  }

  static async findAll(pool, limit = 50, offset = 0) {
    const query = `SELECT al.*, u.name as user_name 
                   FROM audit_logs al 
                   LEFT JOIN users u ON al.user_id = u.id 
                   ORDER BY al.created_at DESC 
                   LIMIT $1 OFFSET $2`;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }
}

module.exports = AuditLog;
