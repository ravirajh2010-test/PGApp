const Organization = require('../models/Organization');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const pool = require('../config/database');
const dbManager = require('../services/DatabaseManager');
const { sendEmail } = require('../services/emailService');

// Organization management
const getOrganizations = async (req, res) => {
  try {
    const orgs = await Organization.findAll();
    // Get stats for each org
    const orgsWithStats = await Promise.all(orgs.map(async (org) => {
      const stats = await Organization.getStats(org.id);
      return {
        ...org,
        stats,
        building_count: stats.buildings,
        bed_count: stats.totalBeds,
        room_count: stats.rooms || 0,
        user_count: stats.users,
        tenant_count: stats.tenants,
        occupied_beds: stats.occupiedBeds,
        vacant_beds: stats.vacantBeds,
        occupancy_rate: stats.occupancyRate,
      };
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
    
    // Aggregate user/bed counts across all org databases
    let totalUsers = 0, totalBeds = 0, occupiedBeds = 0;
    try {
      const orgPools = await dbManager.getAllOrgPools();
      for (const { pool: orgPool } of orgPools) {
        const u = await orgPool.query('SELECT COUNT(*) as count FROM users');
        const b = await orgPool.query('SELECT COUNT(*) as count FROM beds');
        const o = await orgPool.query("SELECT COUNT(*) as count FROM beds WHERE status = 'occupied'");
        totalUsers += parseInt(u.rows[0].count);
        totalBeds += parseInt(b.rows[0].count);
        occupiedBeds += parseInt(o.rows[0].count);
      }
    } catch (err) {
      console.error('Error aggregating org stats:', err.message);
    }
    
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
      total_users: totalUsers,
      total_beds: totalBeds,
      occupied_beds: occupiedBeds,
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
      try {
        const orgPool = await dbManager.getOrgPool(parseInt(orgId));
        logs = await AuditLog.findAll(orgPool);
      } catch (e) {
        logs = [];
      }
    } else {
      logs = [];
    }
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Inactive Users ────────────────────────────────
const getInactiveUsers = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const orgPools = await dbManager.getAllOrgPools();
    const allInactive = [];

    for (const { orgId, pool: orgPool } of orgPools) {
      try {
        // Get org name
        let orgName = 'Unknown';
        try {
          const orgResult = await pool.query('SELECT name FROM organizations WHERE id = $1', [orgId]);
          if (orgResult.rows.length > 0) orgName = orgResult.rows[0].name;
        } catch (e) { /* ignore */ }

        // Users who haven't been active in > N days, or never logged in and created > N days ago
        const result = await orgPool.query(`
          SELECT id, name, email, role, last_active, created_at
          FROM users
          WHERE (
            (last_active IS NOT NULL AND last_active < NOW() - INTERVAL '1 day' * $1)
            OR (last_active IS NULL AND created_at < NOW() - INTERVAL '1 day' * $1)
          )
          ORDER BY COALESCE(last_active, created_at) ASC
        `, [days]);

        for (const user of result.rows) {
          const lastSeen = user.last_active || user.created_at;
          const daysSince = Math.floor((Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60 * 24));
          allInactive.push({
            ...user,
            org_id: orgId,
            org_name: orgName,
            days_inactive: daysSince,
          });
        }
      } catch (error) {
        console.error(`[INACTIVE] Error querying org ${orgId}:`, error.message);
      }
    }

    // Sort by most inactive first
    allInactive.sort((a, b) => b.days_inactive - a.days_inactive);
    res.json(allInactive);
  } catch (error) {
    console.error('Error fetching inactive users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const disableInactiveUser = async (req, res) => {
  try {
    const { orgId, userId } = req.params;
    const orgPool = await dbManager.getOrgPool(parseInt(orgId));

    // Set role to 'guest' to effectively disable them
    await orgPool.query("UPDATE users SET role = 'guest' WHERE id = $1", [parseInt(userId)]);

    // Remove from org mapping so they can't log in
    const userResult = await orgPool.query('SELECT email FROM users WHERE id = $1', [parseInt(userId)]);
    if (userResult.rows.length > 0) {
      await User.removeOrgMapping(userResult.rows[0].email, parseInt(orgId));
    }

    res.json({ message: 'User disabled successfully' });
  } catch (error) {
    console.error('Error disabling user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteInactiveUser = async (req, res) => {
  try {
    const { orgId, userId } = req.params;
    const orgPool = await dbManager.getOrgPool(parseInt(orgId));

    // Get user email before deleting
    const userResult = await orgPool.query('SELECT email FROM users WHERE id = $1', [parseInt(userId)]);

    // Remove tenant record if exists (frees up bed)
    const tenantResult = await orgPool.query('SELECT id, bed_id FROM tenants WHERE user_id = $1', [parseInt(userId)]);
    if (tenantResult.rows.length > 0) {
      const tenant = tenantResult.rows[0];
      if (tenant.bed_id) {
        await orgPool.query("UPDATE beds SET status = 'vacant' WHERE id = $1", [tenant.bed_id]);
      }
      await orgPool.query('DELETE FROM payments WHERE tenant_id = $1', [tenant.id]);
      await orgPool.query('DELETE FROM tenants WHERE id = $1', [tenant.id]);
    }

    await orgPool.query('DELETE FROM users WHERE id = $1', [parseInt(userId)]);

    // Remove from org mapping
    if (userResult.rows.length > 0) {
      await User.removeOrgMapping(userResult.rows[0].email, parseInt(orgId));
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const sendInactiveUserReminder = async (req, res) => {
  try {
    const { orgId, userId } = req.params;
    const orgPool = await dbManager.getOrgPool(parseInt(orgId));

    const userResult = await orgPool.query('SELECT name, email FROM users WHERE id = $1', [parseInt(userId)]);
    if (userResult.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = userResult.rows[0];
    let orgName = 'PG Stay';
    try {
      const orgResult = await pool.query('SELECT name FROM organizations WHERE id = $1', [parseInt(orgId)]);
      if (orgResult.rows.length > 0) orgName = orgResult.rows[0].name;
    } catch (e) { /* ignore */ }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">👋 We Miss You!</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Dear <strong>${user.name}</strong>,</p>
          <p>We noticed you haven't logged into <strong>${orgName}</strong> for a while.</p>
          <p>Your account is still active and your accommodation details are safe. Login to check your payment status, room details, and stay updated.</p>
          <p>If you need any assistance, feel free to contact your admin.</p>
          <p>Warm regards,<br/><strong>${orgName} Team</strong></p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
          <p>&copy; ${new Date().getFullYear()} ${orgName}. All rights reserved.</p>
        </div>
      </div>
    `;

    const sent = await sendEmail(user.email, `👋 We miss you - ${orgName}`, htmlContent);
    if (sent) {
      res.json({ message: 'Reminder sent successfully' });
    } else {
      res.status(500).json({ message: 'Failed to send reminder' });
    }
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getOrganizations, getOrganizationById, updateOrganization,
  suspendOrganization, activateOrganization, deleteOrganization,
  updateOrganizationPlan, getPlatformStats,
  getSubscriptions, getInvoices,
  getPlanLimits, updatePlanLimits,
  getAuditLogs,
  getInactiveUsers, disableInactiveUser, deleteInactiveUser, sendInactiveUserReminder
};
