const express = require('express');
const { getProfile, getStayDetails, getPayments, createPaymentOrder, verifyPayment, getAdminContact } = require('../controllers/tenantController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { tenantIsolation } = require('../middleware/tenantIsolation');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRole(['tenant']));
router.use(tenantIsolation);

router.get('/profile', getProfile);
router.get('/stay-details', getStayDetails);
router.get('/payments', getPayments);
router.post('/pay', createPaymentOrder);
router.post('/verify-payment', verifyPayment);
router.get('/admin-contact', getAdminContact);

module.exports = router;