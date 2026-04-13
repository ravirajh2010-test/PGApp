const express = require('express');
const { createCheckoutSession, checkoutSuccess } = require('../controllers/stripeController');

const router = express.Router();

// Create Stripe Checkout session for paid plans
router.post('/create-checkout-session', createCheckoutSession);

// Handle successful checkout — verify session and create org
router.get('/checkout-success', checkoutSuccess);

module.exports = router;
