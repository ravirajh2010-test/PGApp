const pool = require('../config/database');

/**
 * Middleware to extract and verify org_id from the authenticated user's JWT.
 * Attaches req.orgId for use in all downstream queries.
 */
const tenantIsolation = async (req, res, next) => {
  try {
    // super_admin can access any org via header
    if (req.user && req.user.role === 'super_admin') {
      const targetOrgId = req.headers['x-org-id'];
      if (targetOrgId) {
        // Verify org exists
        const orgResult = await pool.query('SELECT id, status FROM organizations WHERE id = $1', [parseInt(targetOrgId)]);
        if (orgResult.rows.length === 0) {
          return res.status(404).json({ message: 'Organization not found' });
        }
        req.orgId = parseInt(targetOrgId);
      }
      // super_admin without x-org-id can access platform-level routes
      return next();
    }

    // Regular users get org_id from their JWT
    if (!req.user || !req.user.orgId) {
      return res.status(403).json({ message: 'Organization context required' });
    }

    // Verify org is active
    const orgResult = await pool.query('SELECT id, status, plan FROM organizations WHERE id = $1', [req.user.orgId]);
    if (orgResult.rows.length === 0) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const org = orgResult.rows[0];
    if (org.status !== 'active') {
      return res.status(403).json({ message: 'Organization account is suspended. Please contact support.' });
    }

    req.orgId = req.user.orgId;
    req.orgPlan = org.plan;
    next();
  } catch (error) {
    console.error('Tenant isolation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Middleware to check plan limits before creating resources.
 */
const checkPlanLimits = (resourceType) => async (req, res, next) => {
  try {
    if (!req.orgId) return next(); // super_admin without org context

    const limitsResult = await pool.query(
      `SELECT pl.* FROM plan_limits pl 
       JOIN organizations o ON o.plan = pl.plan 
       WHERE o.id = $1`,
      [req.orgId]
    );

    if (limitsResult.rows.length === 0) return next();
    const limits = limitsResult.rows[0];

    let currentCount = 0;
    let maxAllowed = 0;

    switch (resourceType) {
      case 'building':
        const buildingCount = await pool.query('SELECT COUNT(*) as count FROM buildings WHERE org_id = $1', [req.orgId]);
        currentCount = parseInt(buildingCount.rows[0].count);
        maxAllowed = limits.max_properties;
        break;
      case 'bed':
        const bedCount = await pool.query('SELECT COUNT(*) as count FROM beds WHERE org_id = $1', [req.orgId]);
        currentCount = parseInt(bedCount.rows[0].count);
        maxAllowed = limits.max_beds;
        break;
      case 'user':
        const userCount = await pool.query('SELECT COUNT(*) as count FROM users WHERE org_id = $1', [req.orgId]);
        currentCount = parseInt(userCount.rows[0].count);
        maxAllowed = limits.max_users;
        break;
      default:
        return next();
    }

    // -1 means unlimited (enterprise)
    if (maxAllowed !== -1 && currentCount >= maxAllowed) {
      return res.status(403).json({
        message: `Plan limit reached. Your ${req.orgPlan} plan allows ${maxAllowed} ${resourceType}s. Please upgrade your plan.`,
        currentCount,
        maxAllowed,
        plan: req.orgPlan
      });
    }

    next();
  } catch (error) {
    console.error('Plan limit check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Middleware to restrict access to super_admin only
 */
const superAdminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  next();
};

module.exports = { tenantIsolation, checkPlanLimits, superAdminOnly };
