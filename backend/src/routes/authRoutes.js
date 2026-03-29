const express = require('express');
const { register, login, registerOrganization, changePassword } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/register-organization', registerOrganization);
router.post('/change-password', authenticateToken, changePassword);

module.exports = router;