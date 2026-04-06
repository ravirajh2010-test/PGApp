/**
 * Master database pool - used for organizations, plan_limits, subscriptions,
 * invoices, super_admin users, and user_org_map.
 * 
 * For org-scoped data (users, buildings, rooms, beds, tenants, payments),
 * use DatabaseManager.getOrgPool(orgId) instead.
 */
const dbManager = require('../services/DatabaseManager');
const pool = dbManager.initMasterPool();

module.exports = pool;