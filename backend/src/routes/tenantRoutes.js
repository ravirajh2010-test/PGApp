const express = require('express');
const { getProfile, getStayDetails, getPayments, createPaymentOrder, verifyPayment } = require('../controllers/tenantController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRole(['tenant']));

router.get('/profile', getProfile);
router.get('/stay-details', getStayDetails);
router.get('/payments', getPayments);
router.post('/pay', createPaymentOrder);
router.post('/verify-payment', verifyPayment);

module.exports = router;