const express = require('express');
const { register, login, registerOrganization, changePassword, sendOtp } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { tenantIsolation } = require('../middleware/tenantIsolation');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/register-organization', registerOrganization);
router.post('/change-password', authenticateToken, tenantIsolation, changePassword);
router.post('/send-otp', authenticateToken, tenantIsolation, sendOtp);

module.exports = router;