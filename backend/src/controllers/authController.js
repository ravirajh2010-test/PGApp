const User = require('../models/User');
const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const register = async (req, res) => {
  try {
    const { name, email, password, orgSlug } = req.body;
    
    // Find org by slug
    const org = await Organization.findBySlug(orgSlug);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    
    const existingUser = await User.findByEmail(email, org.id);
    if (existingUser) return res.status(400).json({ message: 'User already exists in this organization' });

    const user = await User.create(name, email, password, 'tenant', org.id);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, orgSlug } = req.body;
    
    let user;
    if (orgSlug) {
      // Login within a specific org
      const org = await Organization.findBySlug(orgSlug);
      if (!org) return res.status(404).json({ message: 'Organization not found' });
      user = await User.findByEmail(email, org.id);
    } else {
      // Try super_admin login or find user across orgs
      const users = await User.findByEmailGlobal(email);
      if (users.length === 0) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      // If super_admin (no org), use that
      const superAdmin = users.find(u => u.role === 'super_admin');
      if (superAdmin) {
        user = superAdmin;
      } else if (users.length === 1) {
        user = users[0];
      } else {
        // Multiple orgs found - return org list for user to choose
        return res.status(300).json({
          message: 'Multiple organizations found. Please select one.',
          organizations: users.map(u => ({ id: u.org_id, name: u.org_name, slug: u.org_slug }))
        });
      }
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const tokenPayload = { id: user.id, role: user.role };
    if (user.org_id) tokenPayload.orgId = user.org_id;
    
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });
    
    // Get org info if applicable
    let orgInfo = null;
    if (user.org_id) {
      orgInfo = await Organization.findById(user.org_id);
    }

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        orgId: user.org_id,
        is_first_login: user.is_first_login
      },
      organization: orgInfo ? {
        id: orgInfo.id,
        name: orgInfo.name,
        slug: orgInfo.slug,
        plan: orgInfo.plan,
        status: orgInfo.status
      } : null
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Register a new organization (SaaS onboarding)
const registerOrganization = async (req, res) => {
  try {
    // Accept both API formats: org* and regular field names
    const orgName = req.body.orgName;
    const orgSlug = req.body.orgSlug;
    const orgEmail = req.body.orgEmail || req.body.email;
    const orgPhone = req.body.orgPhone || req.body.phone;
    const orgAddress = req.body.orgAddress || req.body.address;
    const adminName = req.body.adminName || req.body.name;
    const adminEmail = req.body.adminEmail;
    const adminPassword = req.body.adminPassword || req.body.password;
    const plan = req.body.plan || 'free';
    
    if (!orgName || !orgSlug || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ message: 'Organization name, slug, admin name, email and password are required' });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(orgSlug)) {
      return res.status(400).json({ message: 'Slug must contain only lowercase letters, numbers, and hyphens' });
    }

    // Check if slug already taken
    const existingOrg = await Organization.findBySlug(orgSlug);
    if (existingOrg) {
      return res.status(400).json({ message: 'Organization slug is already taken' });
    }

    // Create organization
    const org = await Organization.create(orgName, orgSlug, orgEmail, orgPhone, orgAddress, plan);
    
    // Create subscription based on plan
    const Subscription = require('../models/Subscription');
    await Subscription.create(org.id, plan, 0, 'monthly');

    // Create admin user for this org
    const user = await User.create(adminName, adminEmail, adminPassword, 'admin', org.id);
    
    const token = jwt.sign({ id: user.id, role: user.role, orgId: org.id }, process.env.JWT_SECRET, { expiresIn: '8h' });
    
    res.status(201).json({
      message: 'Organization created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        orgId: org.id,
        is_first_login: false
      },
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan,
        status: org.status
      }
    });
  } catch (error) {
    console.error('Organization registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const userId = req.user?.id;

    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }

    const user = await User.findById(userId);
    if (!user || user.email !== email) {
      return res.status(400).json({ message: 'Email does not match your account' });
    }

    const updatedUser = await User.changePassword(userId, newPassword);
    res.json({ 
      message: 'Password changed successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        orgId: updatedUser.org_id,
        is_first_login: updatedUser.is_first_login
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { register, login, registerOrganization, changePassword };