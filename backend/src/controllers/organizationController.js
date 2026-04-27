const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { sendTenantCredentials } = require('../services/emailService');
const { logRequestAudit, getRequestIp } = require('../services/auditService');

const getMyOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    
    const stats = await Organization.getStats(req.orgId);
    const subscription = await Subscription.findByOrgId(req.orgId);
    const limits = await Organization.getPlanLimits(org.plan);
    
    res.json({ ...org, stats, subscription, limits });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateMyOrganization = async (req, res) => {
  try {
    const { name, email, phone, address, default_electricity_rate } = req.body;
    const updates = { name, email, phone, address };
    if (default_electricity_rate !== undefined && default_electricity_rate !== null && default_electricity_rate !== '') {
      const parsedRate = Number(default_electricity_rate);
      if (Number.isNaN(parsedRate) || parsedRate < 0) {
        return res.status(400).json({ message: 'Default electricity rate must be a non-negative number.' });
      }
      updates.default_electricity_rate = parsedRate;
    }
    const org = await Organization.update(req.orgId, updates);
    await AuditLog.create(
      req.pool,
      req.user.id,
      'ORGANIZATION_UPDATED',
      'organization',
      req.orgId,
      updates,
      getRequestIp(req)
    );
    res.json(org);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getMySubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByOrgId(req.orgId);
    const org = await Organization.findById(req.orgId);
    const limits = await Organization.getPlanLimits(org.plan);
    const allPlans = await Organization.getAllPlanLimits();
    
    res.json({ subscription, currentPlan: org.plan, limits, availablePlans: allPlans });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.findByOrgId(req.orgId);
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.findAll(req.pool);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyUsers = async (req, res) => {
  try {
    const users = await User.findAll(req.pool);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Add an additional admin to the organization (typically a secondary/backup admin).
const addOrgAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();

    // Limit organization to two active admins.
    const adminCountResult = await req.pool.query(
      "SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'"
    );
    if ((adminCountResult.rows[0]?.count || 0) >= 2) {
      return res.status(400).json({ message: 'This organization already has the maximum number of admins (2).' });
    }

    // Reject if the email is already used anywhere else (any org or super admin).
    const [existingInOrg, mappedOrgs, legacyUser, superAdmin] = await Promise.all([
      User.findByEmail(req.pool, cleanEmail),
      User.findOrgsByEmail(cleanEmail),
      User.findLegacyOrgUserByEmail(cleanEmail),
      User.findSuperAdminByEmail(cleanEmail),
    ]);

    if (existingInOrg || (mappedOrgs && mappedOrgs.length > 0) || legacyUser || superAdmin) {
      return res.status(400).json({ message: `The email ${cleanEmail} is already registered.` });
    }

    const newAdmin = await User.create(req.pool, cleanName, cleanEmail, password, 'admin');
    await User.addOrgMapping(cleanEmail, req.orgId, newAdmin.id, 'admin');

    // Best-effort welcome email so the new admin has their credentials handy.
    let emailSent = false;
    try {
      const org = await Organization.findById(req.orgId);
      emailSent = await sendTenantCredentials(
        cleanEmail,
        cleanName,
        password,
        'Admin workspace',
        org?.name || 'PG Stay'
      );
    } catch (emailErr) {
      console.error('Failed to send admin welcome email:', emailErr.message);
    }

    await logRequestAudit(req, {
      action: 'ADMIN_ADDED',
      entityType: 'user',
      entityId: newAdmin.id,
      details: { email: cleanEmail, role: 'admin', emailSent },
    });

    res.status(201).json({
      message: 'Secondary admin added successfully',
      emailSent,
      user: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    console.error('Error adding org admin:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Remove an admin (only if at least one admin remains, and never removes self).
const removeOrgAdmin = async (req, res) => {
  try {
    const targetId = parseInt(req.params.userId, 10);
    if (!Number.isInteger(targetId)) {
      return res.status(400).json({ message: 'Invalid user id.' });
    }
    if (targetId === req.user.id) {
      return res.status(400).json({ message: 'You cannot remove your own admin account.' });
    }

    const target = await User.findById(req.pool, targetId);
    if (!target || target.role !== 'admin') {
      return res.status(404).json({ message: 'Admin user not found in this organization.' });
    }

    const adminCountResult = await req.pool.query(
      "SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'"
    );
    if ((adminCountResult.rows[0]?.count || 0) <= 1) {
      return res.status(400).json({ message: 'Cannot remove the only admin in this organization.' });
    }

    await req.pool.query('DELETE FROM users WHERE id = $1', [targetId]);
    try {
      await User.removeOrgMapping(target.email, req.orgId);
    } catch (e) {
      console.warn('Failed to remove org mapping for admin:', e.message);
    }

    await logRequestAudit(req, {
      action: 'ADMIN_REMOVED',
      entityType: 'user',
      entityId: targetId,
      details: { email: target.email },
    });

    res.json({ message: 'Admin removed successfully.' });
  } catch (error) {
    console.error('Error removing org admin:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getMyOrganization,
  updateMyOrganization,
  getMySubscription,
  getMyInvoices,
  getMyAuditLogs,
  getMyUsers,
  addOrgAdmin,
  removeOrgAdmin,
};
