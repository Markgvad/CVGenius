// controllers/paymentController.js
const path = require('path');
const User = require('../models/user');
const logger = require('../utils/logger');

/**
 * Get Stripe publishable key
 */
exports.getStripeConfig = (req, res) => {
  try {
    // Use environment variable for publishable key
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      logger.error('STRIPE_PUBLISHABLE_KEY is not configured');
      return res.status(500).json({ error: 'Stripe is not configured' });
    }
    
    res.json({ publishableKey });
  } catch (error) {
    logger.error('Error providing Stripe config:', error);
    res.status(500).json({ error: 'Failed to provide Stripe configuration' });
  }
};

/**
 * Create checkout session for subscription
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (!['premium-monthly', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }
    
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe is not configured' });
    }
    
    let stripe;
    try {
      stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    } catch (error) {
      logger.error('Error initializing Stripe:', error);
      return res.status(500).json({ error: 'Error initializing payment processor' });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const PRODUCTS = {
      PREMIUM_MONTHLY: {
        price: 700, // $7.00
        tier: 'premium-monthly'
      },
      PREMIUM: {
        price: 5900, // $59.00
        tier: 'premium'
      }
    };
    
    const product = plan === 'premium-monthly' ? PRODUCTS.PREMIUM_MONTHLY : PRODUCTS.PREMIUM;
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `CV Genius ${plan === 'premium-monthly' ? 'Premium Monthly' : 'Premium Yearly'} Plan`,
              description: plan === 'premium-monthly' ? 
                'Unlimited CVs, hosting, PDF landing page, advanced analytics (monthly billing)' : 
                'Unlimited CVs, hosting, PDF landing page, advanced analytics, priority support (annual billing)'
            },
            unit_amount: product.price,
            recurring: {
              interval: plan === 'premium-monthly' ? 'month' : 'year',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.DOMAIN || 'http://localhost:5000'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN || 'http://localhost:5000'}/pricing`,
      customer_email: user.email,
      client_reference_id: user._id.toString(),
      metadata: {
        userId: user._id.toString(),
        plan: plan
      }
    });
    
    res.json({ sessionId: session.id });
  } catch (error) {
    logger.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

/**
 * Get subscription status
 */
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Convert Infinity to a large number that JSON can handle
    const allowedCVs = user.allowedCVs === Infinity ? 99999 : user.allowedCVs || 1;
    
    res.json({
      tier: user.subscriptionTier || 'free',
      expiresAt: user.subscriptionEnd,
      allowedCVs: allowedCVs,
      hasAnalytics: user.hasAnalytics || false
    });
  } catch (error) {
    logger.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
};

/**
 * Verify session after return from Stripe
 */
exports.verifySession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      logger.info('Session verification failed: No session ID provided');
      return res.status(400).json({ success: false, error: 'Session ID is required' });
    }
    
    if (!process.env.STRIPE_SECRET_KEY) {
      logger.info('Session verification failed: Stripe not configured');
      return res.status(500).json({ success: false, error: 'Stripe is not configured' });
    }
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    logger.info(`Verifying Stripe session ${sessionId} for user ${req.user.id}`);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logger.info(`Session retrieved, payment status: ${session.payment_status}`);
    
    if (session.payment_status !== 'paid') {
      logger.info('Session verification failed: Payment not completed');
      return res.json({ success: false, error: 'Payment not completed' });
    }
    
    // Verify that this is for the authenticated user
    if (!session.metadata || !session.metadata.userId) {
      logger.info('Session verification failed: No userId in metadata');
      return res.status(400).json({ success: false, error: 'Invalid session metadata' });
    }
    
    if (session.metadata.userId !== req.user.id) {
      logger.warn(`Session verification failed: Session userId ${session.metadata.userId} does not match authenticated user ${req.user.id}`);
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    // Update user subscription if not already updated by webhook
    logger.info(`Updating user ${req.user.id} subscription to ${session.metadata.plan}`);
    const user = await User.findById(req.user.id);
    
    if (!user) {
      logger.info('Session verification failed: User not found');
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    if (user.subscriptionTier !== session.metadata.plan) {
      logger.info(`Updating user subscription from ${user.subscriptionTier} to ${session.metadata.plan}`);
      user.updateSubscription(session.metadata.plan, session.subscription);
      await user.save();
      logger.info('User subscription updated successfully');
    } else {
      logger.info('User subscription already up to date');
    }
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Error verifying session:', error);
    res.status(500).json({ success: false, error: 'Error verifying session' });
  }
};

/**
 * Handle Stripe webhook
 */
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!process.env.STRIPE_SECRET_KEY) {
    logger.error('STRIPE_SECRET_KEY is not configured');
    return res.status(500).send('Stripe is not configured');
  }

  let stripe;
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  } catch (error) {
    logger.error('Error initializing Stripe:', error);
    return res.status(500).send('Error initializing Stripe');
  }

  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET is not configured');
    return res.status(500).send('Webhook secret is not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Process the event
    logger.info('Webhook event received:', event.type);
    
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleSuccessfulSubscription(session);
        break;
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        await handleCanceledSubscription(subscription);
        break;
    }
    
    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Handle successful subscription
 */
async function handleSuccessfulSubscription(session) {
  try {
    const userId = session.metadata.userId;
    const plan = session.metadata.plan;
    const subscriptionId = session.subscription;

    logger.info(`Processing successful subscription: userId=${userId}, plan=${plan}, subId=${subscriptionId}`);

    const user = await User.findById(userId);
    if (!user) {
      logger.error('User not found for subscription:', userId);
      return;
    }

    user.updateSubscription(plan, subscriptionId);
    await user.save();
    logger.info(`User ${userId} subscription updated to ${plan}`);
  } catch (error) {
    logger.error('Error handling successful subscription:', error);
  }
}

/**
 * Handle canceled subscription
 */
async function handleCanceledSubscription(subscription) {
  try {
    const user = await User.findOne({ subscriptionId: subscription.id });
    if (!user) {
      logger.error('User not found for canceled subscription:', subscription.id);
      return;
    }

    user.updateSubscription('free', null);
    await user.save();
    logger.info(`User ${user._id} subscription canceled and reverted to free tier`);
  } catch (error) {
    logger.error('Error handling canceled subscription:', error);
  }
}

/**
 * Handle success page
 */
exports.handleSuccessPage = (req, res) => {
  // Log the query parameters for debugging
  logger.debug('Success page requested with query params:', req.query);
  
  const sessionId = req.query.session_id;
  
  if (!sessionId) {
    logger.debug('No session_id provided, redirecting to pricing');
    return res.redirect('/pricing');
  }
  
  // Just serve the success.html page - the client-side JS will handle verification
  res.sendFile(path.join(__dirname, '../public', 'success.html'));
};