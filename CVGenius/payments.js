// Install Stripe
// npm install stripe

// In server.js or a dedicated payments.js file
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create subscription plans endpoint
app.post('/api/create-subscription', authService.authenticateJWT, async (req, res) => {
  try {
    const { paymentMethodId, priceId } = req.body;
    
    // Get or create customer
    let customer;
    const user = await User.findById(req.user.id);
    
    if (user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        payment_method: paymentMethodId,
        invoice_settings: { default_payment_method: paymentMethodId }
      });
      
      // Save customer ID to user
      user.stripeCustomerId = customer.id;
      await user.save();
    }
    
    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      expand: ['latest_invoice.payment_intent']
    });
    
    // Update user subscription status
    user.subscription = priceId.includes('premium') ? 'premium' : 'professional';
    user.stripeSubscriptionId = subscription.id;
    await user.save();
    
    res.json({ subscription });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});