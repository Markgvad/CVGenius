// routes/payment.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateJWT } = require('../middleware/auth');

// Get Stripe publishable key
router.get('/stripe-config', paymentController.getStripeConfig);

// Create checkout session
router.post('/create-checkout-session', authenticateJWT, paymentController.createCheckoutSession);

// Get subscription status
router.get('/subscription-status', authenticateJWT, paymentController.getSubscriptionStatus);

// Verify session after payment
router.post('/verify-session', authenticateJWT, paymentController.verifySession);

// Note: The webhook endpoint is defined directly in server.js because
// it needs the raw body parser middleware

module.exports = router;