const express = require('express');
const { getMyOrganization, updateMyOrganization, getMySubscription, getMyInvoices, getMyAuditLogs, getMyUsers } = require('../controllers/organizationController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { tenantIsolation } = require('../middleware/tenantIsolation');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRole(['admin']));
router.use(tenantIsolation);

router.get('/me', getMyOrganization);
router.put('/me', updateMyOrganization);
router.get('/subscription', getMySubscription);
router.get('/invoices', getMyInvoices);
router.get('/audit-logs', getMyAuditLogs);
router.get('/users', getMyUsers);

module.exports = router;
