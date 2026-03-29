const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(name, email, password, role, orgId) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (name, email, password, role, org_id, is_first_login) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *';
    const values = [name, email, hashedPassword, role, orgId];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async createSuperAdmin(name, email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (name, email, password, role, is_first_login) VALUES ($1, $2, $3, $4, FALSE) RETURNING *';
    const values = [name, email, hashedPassword, 'super_admin'];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email, orgId) {
    try {
      let query, params;
      if (orgId) {
        query = 'SELECT * FROM users WHERE email = $1 AND org_id = $2';
        params = [email, orgId];
      } else {
        // For super_admin login (no org context) or org lookup
        query = 'SELECT * FROM users WHERE email = $1';
        params = [email];
      }
      const result = await pool.query(query, params);
      return result.rows[0];
    } catch (error) {
      console.error('[USER] Database error:', error.message);
      throw error;
    }
  }

  static async findByEmailGlobal(email) {
    const query = 'SELECT u.*, o.name as org_name, o.slug as org_slug FROM users u LEFT JOIN organizations o ON u.org_id = o.id WHERE u.email = $1';
    const result = await pool.query(query, [email]);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT id, name, email, role, org_id, is_first_login FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByOrgId(orgId) {
    const query = 'SELECT id, name, email, role, is_first_login, created_at FROM users WHERE org_id = $1 ORDER BY created_at DESC';
    const result = await pool.query(query, [orgId]);
    return result.rows;
  }

  static async changePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE users SET password = $1, is_first_login = FALSE WHERE id = $2 RETURNING id, name, email, role, org_id, is_first_login';
    const result = await pool.query(query, [hashedPassword, id]);
    return result.rows[0];
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE users SET password = $1 WHERE id = $2 RETURNING id, name, email, role, org_id, is_first_login';
    const result = await pool.query(query, [hashedPassword, id]);
    return result.rows[0];
  }
}

module.exports = User;