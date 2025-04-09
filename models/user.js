// models/user.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  // Subscription fields
  subscriptionTier: { 
    type: String, 
    enum: ['free', 'premium-monthly', 'premium'], 
    default: 'free' 
  },
  subscriptionId: { type: String },
  subscriptionStart: { type: Date },
  subscriptionEnd: { type: Date },
  allowedCVs: { type: Number, default: 1 },
  // Analytics access
  hasAnalytics: { type: Boolean, default: false }
});

// Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update subscription
userSchema.methods.updateSubscription = function(tier, subscriptionId) {
  this.subscriptionTier = tier;
  this.subscriptionId = subscriptionId;
  this.subscriptionStart = new Date();
  
  // Set end date and features based on tier
  if (tier === 'free') {
    // Free tier: 3 months
    this.subscriptionEnd = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    this.allowedCVs = 1;
    this.hasAnalytics = false;
  } else if (tier === 'premium-monthly') {
    // Premium Monthly tier: 1 month
    this.subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    this.allowedCVs = Infinity; // unlimited CVs
    this.hasAnalytics = true;
  } else if (tier === 'premium') {
    // Premium Annual tier: 1 year
    this.subscriptionEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    this.allowedCVs = Infinity; // unlimited CVs
    this.hasAnalytics = true;
  }
};

module.exports = mongoose.model('User', userSchema);