const pool = require('../config/database');

class AuditLog {
  static async create(orgId, userId, action, entityType, entityId, details, ipAddress) {
    const query = `INSERT INTO audit_logs (org_id, user_id, action, entity_type, entity_id, details, ip_address) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
    const result = await pool.query(query, [orgId, userId, action, entityType, entityId, details ? JSON.stringify(details) : null, ipAddress]);
    return result.rows[0];
  }

  static async findByOrgId(orgId, limit = 50, offset = 0) {
    const query = `SELECT al.*, u.name as user_name 
                   FROM audit_logs al 
                   LEFT JOIN users u ON al.user_id = u.id 
                   WHERE al.org_id = $1 
                   ORDER BY al.created_at DESC 
                   LIMIT $2 OFFSET $3`;
    const result = await pool.query(query, [orgId, limit, offset]);
    return result.rows;
  }
}

module.exports = AuditLog;
