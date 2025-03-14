// services/payment/stripeService.js
const User = require('../../models/user');

// Don't initialize Stripe at the module level - this is the KEY ISSUE
const PRODUCTS = {
  STANDARD: {
    priceId: null,
    price: 1000, // $10.00
    tier: 'standard'
  },
  PREMIUM: {
    priceId: null,
    price: 2900, // $29.00
    tier: 'premium'
  }
};

// Create a checkout session
exports.createCheckoutSession = async (userId, plan) => {
  // Initialize Stripe inside the function
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const product = plan === 'standard' ? PRODUCTS.STANDARD : PRODUCTS.PREMIUM;
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `CVGenius ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
            description: plan === 'standard' ? 
              '1 CV, hosting, landing page PDF (1 year)' : 
              '3 CVs, hosting, landing page PDF, detailed analytics (1 year)'
          },
          unit_amount: product.price,
          recurring: {
            interval: 'year',
          },
        },
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.DOMAIN}/pricing`,
    customer_email: user.email,
    client_reference_id: userId,
    metadata: {
      userId: userId,
      plan: plan
    }
  });

  return session;
};

// Handle webhook events
exports.handleWebhookEvent = async (event) => {
  // Initialize Stripe inside the function
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
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
};

// Handle successful subscription
async function handleSuccessfulSubscription(session) {
  const userId = session.metadata.userId;
  const plan = session.metadata.plan;
  const subscriptionId = session.subscription;

  const user = await User.findById(userId);
  if (!user) return;

  user.updateSubscription(plan, subscriptionId);
  await user.save();
}

// Handle canceled subscription
async function handleCanceledSubscription(subscription) {
  const user = await User.findOne({ subscriptionId: subscription.id });
  if (!user) return;

  user.updateSubscription('free', null);
  await user.save();
}

module.exports = exports;