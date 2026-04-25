const masterPool = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * User model - org-scoped methods accept pool as first parameter.
 * Super admin methods use masterPool directly.
 * 
 * user_org_map in master DB tracks email→org mappings for cross-org login.
 */
class User {
  // --- Org-scoped methods (use org pool) ---

  static async create(pool, name, email, password, role) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role, is_first_login) VALUES ($1, $2, $3, $4, TRUE) RETURNING *',
      [name, email, hashedPassword, role]
    );
    return result.rows[0];
  }

  static async findByEmail(pool, email) {
    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0];
    } catch (error) {
      console.error('[USER] Database error:', error.message);
      throw error;
    }
  }

  static async findById(pool, id) {
    const result = await pool.query(
      'SELECT id, name, email, role, is_first_login FROM users WHERE id = $1', [id]
    );
    return result.rows[0];
  }

  static async findAll(pool) {
    const result = await pool.query(
      'SELECT id, name, email, role, is_first_login, created_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  }

  static async changePassword(pool, id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      'UPDATE users SET password = $1, is_first_login = FALSE WHERE id = $2 RETURNING id, name, email, role, is_first_login',
      [hashedPassword, id]
    );
    return result.rows[0];
  }

  static async updatePassword(pool, id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2 RETURNING id, name, email, role, is_first_login',
      [hashedPassword, id]
    );
    return result.rows[0];
  }

  // --- Master DB methods (for super admin & cross-org lookups) ---

  static async createSuperAdmin(name, email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await masterPool.query(
      "INSERT INTO users (name, email, password, role, is_first_login) VALUES ($1, $2, $3, 'super_admin', FALSE) RETURNING *",
      [name, email, hashedPassword]
    );
    return result.rows[0];
  }

  static async findSuperAdminByEmail(email) {
    const result = await masterPool.query(
      "SELECT * FROM users WHERE email = $1 AND role = 'super_admin'", [email]
    );
    return result.rows[0];
  }

  static async findSuperAdminById(id) {
    const result = await masterPool.query(
      "SELECT id, name, email, role, is_first_login FROM users WHERE id = $1 AND role = 'super_admin'", [id]
    );
    return result.rows[0];
  }

  /**
   * Register an email→org mapping in the master DB for cross-org login lookups.
   */
  static async addOrgMapping(email, orgId, userId, role) {
    await masterPool.query(
      'INSERT INTO user_org_map (email, org_id, user_id, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email, org_id) DO UPDATE SET user_id = $3, role = $4',
      [email, orgId, userId, role]
    );
  }

  /**
   * Remove an email→org mapping from master DB.
   */
  static async removeOrgMapping(email, orgId) {
    await masterPool.query(
      'DELETE FROM user_org_map WHERE email = $1 AND org_id = $2',
      [email, orgId]
    );
  }

  /**
   * Find all orgs a user belongs to (for multi-org login).
   */
  static async findOrgsByEmail(email) {
    const result = await masterPool.query(
      `SELECT uom.org_id, uom.user_id, uom.role, o.name as org_name, o.slug as org_slug, o.organization_code
       FROM user_org_map uom 
       JOIN organizations o ON uom.org_id = o.id 
       WHERE uom.email = $1 AND o.status = 'active'`,
      [email]
    );
    return result.rows;
  }

  /**
   * Backward compatibility for pre-migration users stored in master users table.
   */
  static async findLegacyOrgUserByEmail(email) {
    const result = await masterPool.query(
      `SELECT id, name, email, password, role, is_first_login, org_id
       FROM users
       WHERE email = $1 AND role != 'super_admin' AND org_id IS NOT NULL
       LIMIT 1`,
      [email]
    );
    return result.rows[0];
  }
}

module.exports = User;