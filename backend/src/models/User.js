const pool = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(name, email, password, role) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (name, email, password, role, is_first_login) VALUES ($1, $2, $3, $4, TRUE) RETURNING *';
    const values = [name, email, hashedPassword, role];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      console.log('[USER] Executing query:', query, 'with email:', email);
      const result = await pool.query(query, [email]);
      console.log('[USER] Query result rows:', result.rows);
      return result.rows[0];
    } catch (error) {
      console.error('[USER] Database error:', error.message);
      throw error;
    }
  }

  static async findById(id) {
    const query = 'SELECT id, name, email, role, is_first_login FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async changePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE users SET password = $1, is_first_login = FALSE WHERE id = $2 RETURNING id, name, email, role, is_first_login';
    const result = await pool.query(query, [hashedPassword, id]);
    return result.rows[0];
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const query = 'UPDATE users SET password = $1 WHERE id = $2 RETURNING id, name, email, role, is_first_login';
    const result = await pool.query(query, [hashedPassword, id]);
    return result.rows[0];
  }
}

module.exports = User;