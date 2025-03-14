// routes/payments.js
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const authService = require('../services/auth');

// Create checkout session for subscription
router.post('/create-checkout-session', function(req, res, next) {
  authService.authenticateJWT(req, res, next);
}, async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (!['standard', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }
    
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe is not configured' });
    }
    
    const stripeService = require('../services/payment/stripeService');
    const session = await stripeService.createCheckoutSession(req.user.id, plan);
    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Get subscription status
router.get('/subscription-status', function(req, res, next) {
  authService.authenticateJWT(req, res, next);
}, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      tier: user.subscriptionTier || 'free',
      expiresAt: user.subscriptionEnd,
      allowedCVs: user.allowedCVs || 1,
      hasAnalytics: user.hasAnalytics || false
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

module.exports = router;