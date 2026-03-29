const express = require('express');
const {
  getOrganizations, getOrganizationById, updateOrganization,
  suspendOrganization, activateOrganization, deleteOrganization,
  updateOrganizationPlan, getPlatformStats,
  getSubscriptions, getInvoices,
  getPlanLimits, updatePlanLimits,
  getAuditLogs
} = require('../controllers/superAdminController');
const { authenticateToken } = require('../middleware/auth');
const { superAdminOnly } = require('../middleware/tenantIsolation');

const router = express.Router();

router.use(authenticateToken);
router.use(superAdminOnly);

// Platform stats
router.get('/stats', getPlatformStats);

// Organizations
router.get('/organizations', getOrganizations);
router.get('/organizations/:id', getOrganizationById);
router.put('/organizations/:id', updateOrganization);
router.post('/organizations/:id/suspend', suspendOrganization);
router.post('/organizations/:id/activate', activateOrganization);
router.delete('/organizations/:id', deleteOrganization);
router.put('/organizations/:id/plan', updateOrganizationPlan);

// Subscriptions & Invoices
router.get('/subscriptions', getSubscriptions);
router.get('/invoices', getInvoices);

// Plan limits
router.get('/plans', getPlanLimits);
router.put('/plans/:plan', updatePlanLimits);

// Audit logs
router.get('/audit-logs', getAuditLogs);

module.exports = router;
