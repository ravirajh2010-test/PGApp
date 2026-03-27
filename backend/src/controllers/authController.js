const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findByEmail(email);
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create(name, email, password, role || 'tenant');
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('[LOGIN] Attempting login for:', email);
    console.log('[LOGIN] Request body:', req.body);
    const user = await User.findByEmail(email);
    console.log('[LOGIN] Query result:', user);
    if (!user) {
      console.log('[LOGIN] ❌ User not found:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log('[LOGIN] ✅ User found:', user.email);
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('[LOGIN] Password comparison result:', isMatch);
    if (!isMatch) {
      console.log('[LOGIN] ❌ Password mismatch for:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        is_first_login: user.is_first_login
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const userId = req.user?.id;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    // Verify email matches the logged-in user
    const user = await User.findById(userId);
    if (!user || user.email !== email) {
      return res.status(400).json({ message: 'Email does not match your account' });
    }

    // Update password
    const updatedUser = await User.changePassword(userId, newPassword);
    res.json({ 
      message: 'Password changed successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        is_first_login: updatedUser.is_first_login
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { register, login, changePassword };