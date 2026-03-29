const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const pool = require('../config/database');

// Organization management
const getOrganizations = async (req, res) => {
  try {
    const orgs = await Organization.findAll();
    // Get stats for each org
    const orgsWithStats = await Promise.all(orgs.map(async (org) => {
      const stats = await Organization.getStats(org.id);
      return { ...org, stats };
    }));
    res.json(orgsWithStats);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getOrganizationById = async (req, res) => {
  try {
    const { id } = req.params;
    const org = await Organization.findById(id);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    
    const stats = await Organization.getStats(id);
    const subscription = await Subscription.findByOrgId(id);
    
    res.json({ ...org, stats, subscription });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const org = await Organization.update(id, updates);
    res.json(org);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const suspendOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const org = await Organization.updateStatus(id, 'suspended');
    res.json({ message: 'Organization suspended', org });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const activateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const org = await Organization.updateStatus(id, 'active');
    res.json({ message: 'Organization activated', org });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    await Organization.delete(id);
    res.json({ message: 'Organization deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updateOrganizationPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;
    
    const org = await Organization.updatePlan(id, plan);
    
    // Update subscription
    const limits = await Organization.getPlanLimits(plan);
    const currentSub = await Subscription.findByOrgId(id);
    if (currentSub) {
      await Subscription.update(currentSub.id, { plan, amount: limits.price_monthly });
    } else {
      await Subscription.create(id, plan, limits.price_monthly, 'monthly');
    }
    
    res.json({ message: 'Plan updated successfully', org });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Platform stats
const getPlatformStats = async (req, res) => {
  try {
    const orgCount = await pool.query('SELECT COUNT(*) as count FROM organizations');
    const activeOrgCount = await pool.query("SELECT COUNT(*) as count FROM organizations WHERE status = 'active'");
    const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalBeds = await pool.query('SELECT COUNT(*) as count FROM beds');
    const occupiedBeds = await pool.query("SELECT COUNT(*) as count FROM beds WHERE status = 'occupied'");
    
    const planDistribution = await pool.query(
      'SELECT plan, COUNT(*) as count FROM organizations GROUP BY plan ORDER BY plan'
    );

    const recentOrgs = await pool.query(
      'SELECT id, name, slug, plan, status, created_at FROM organizations ORDER BY created_at DESC LIMIT 10'
    );

    const monthlyRevenue = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) as revenue 
      FROM invoices 
      WHERE status = 'paid' 
      AND invoice_date >= date_trunc('month', CURRENT_DATE)
    `);

    res.json({
      total_organizations: parseInt(orgCount.rows[0].count),
      active_organizations: parseInt(activeOrgCount.rows[0].count),
      total_users: parseInt(totalUsers.rows[0].count),
      total_beds: parseInt(totalBeds.rows[0].count),
      occupied_beds: parseInt(occupiedBeds.rows[0].count),
      plan_distribution: planDistribution.rows,
      recent_organizations: recentOrgs.rows,
      monthly_revenue: parseFloat(monthlyRevenue.rows[0].revenue)
    });
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Subscription management
const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll();
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Invoices
const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.findAll();
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Plan limits
const getPlanLimits = async (req, res) => {
  try {
    const plans = await Organization.getAllPlanLimits();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const updatePlanLimits = async (req, res) => {
  try {
    const { plan } = req.params;
    const { max_properties, max_beds, max_users, price_monthly, price_yearly, features } = req.body;
    
    const result = await pool.query(
      `UPDATE plan_limits SET max_properties = $1, max_beds = $2, max_users = $3, 
       price_monthly = $4, price_yearly = $5, features = $6 WHERE plan = $7 RETURNING *`,
      [max_properties, max_beds, max_users, price_monthly, price_yearly, JSON.stringify(features), plan]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Audit logs
const getAuditLogs = async (req, res) => {
  try {
    const { orgId } = req.query;
    let logs;
    if (orgId) {
      logs = await AuditLog.findByOrgId(orgId);
    } else {
      const result = await pool.query(
        `SELECT al.*, u.name as user_name, o.name as org_name 
         FROM audit_logs al 
         LEFT JOIN users u ON al.user_id = u.id 
         LEFT JOIN organizations o ON al.org_id = o.id 
         ORDER BY al.created_at DESC LIMIT 100`
      );
      logs = result.rows;
    }
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getOrganizations, getOrganizationById, updateOrganization,
  suspendOrganization, activateOrganization, deleteOrganization,
  updateOrganizationPlan, getPlatformStats,
  getSubscriptions, getInvoices,
  getPlanLimits, updatePlanLimits,
  getAuditLogs
};
