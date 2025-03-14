// VERY IMPORTANT: This needs to be at the very top of server.js!
const fs = require('fs');
const path = require('path');

// Load config directly first (bypassing dotenv)
try {
  const config = require('./config');
  process.env.STRIPE_SECRET_KEY = config.STRIPE_SECRET_KEY;
  process.env.STRIPE_PUBLISHABLE_KEY = config.STRIPE_PUBLISHABLE_KEY;
  process.env.STRIPE_WEBHOOK_SECRET = config.STRIPE_WEBHOOK_SECRET;
  console.log('Loaded Stripe configuration from config.js');
} catch (error) {
  console.error('Error loading config.js:', error.message);
}

// Then continue with normal dotenv config
require('dotenv').config();

// Rest of your imports
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');

const fetch = require('node-fetch');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

// Import services
const templateService = require('./services/templates/templateService');
const dataExtractionService = require('./services/dataExtractionService');

// Initialize express
const app = express();
const port = process.env.PORT || 5000;

// Check for Anthropic API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('WARNING: ANTHROPIC_API_KEY is not set in .env file');
}
console.log(`Anthropic Claude API key: ${process.env.ANTHROPIC_API_KEY ? 'Found' : 'Missing'}`);
console.log(`Using Anthropic Claude API service with ${process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-20250219'}`);

// Check for Stripe API key
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('WARNING: STRIPE_SECRET_KEY is not set in .env file');
} else {
  console.log('Stripe API key: Found');
}

// In-memory CV storage (fallback if MongoDB is unavailable)
const inMemoryCVs = new Map();
let useInMemoryStorage = false;

// MongoDB connection settings with better logging
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB successfully');
  console.log('MongoDB connection state:', mongoose.connection.readyState);
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected');
});

// MongoDB connection
const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/cvgenius';
console.log('Attempting to connect to MongoDB at:', mongoUrl);

mongoose.connect(mongoUrl)
  .then(() => {
    console.log('Connected to MongoDB');
    useInMemoryStorage = false;
    // Load CV model
    initializeCVModel();
    // Load User model
    initializeUserModel();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Falling back to in-memory storage - saved CVs will not persist when server restarts');
    useInMemoryStorage = true;
  });

// CV model definition
let CV;
function initializeCVModel() {
  try {
    // First try to require the model
    CV = require('./models/cv');
    console.log('CV model loaded from models/cv.js');
  } catch (error) {
    console.log('Could not load CV model from file, creating dynamically:', error.message);
    
    const cvSchema = new mongoose.Schema({
      urlId: { type: String, required: true, unique: true },
      customUrlName: { type: String, unique: true, sparse: true },
      fileName: String,
      fileSize: Number,
      fileType: String,
      structuredData: Object,
      html: String,
      uploadDate: { type: Date, default: Date.now },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      views: { type: Number, default: 0 },
      lastViewed: Date,
      sectionInteractions: [{
        sectionId: String,
        sectionTitle: String,
        sectionType: String,
        clicks: { type: Number, default: 1 },
        lastClicked: { type: Date, default: Date.now }
      }]
    });
    
    try {
      // Check if model already exists to prevent overwrite
      if (mongoose.models.CV) {
        console.log('Using existing CV model from mongoose.models');
        CV = mongoose.models.CV;
      } else {
        console.log('Creating new CV model');
        CV = mongoose.model('CV', cvSchema);
      }
      console.log('CV model initialized');
    } catch (error) {
      console.error('Error initializing CV model:', error);
    }
  }
}

// User model definition
let User;
function initializeUserModel() {
  const userSchema = new mongoose.Schema({
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    cvs: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CV'
    }],
    subscription: {
      type: String,
      enum: ['free', 'premium', 'professional'],
      default: 'free'
    },
    lastLogin: Date,
    // New subscription fields
    subscriptionId: String,
    subscriptionStatus: {
      type: String,
      enum: ['none', 'active', 'past_due', 'canceled', 'unpaid'],
      default: 'none'
    },
    subscriptionPlan: {
      type: String,
      enum: ['free', 'basic', 'premium', 'professional'],
      default: 'free'
    },
    subscriptionStartDate: Date,
    subscriptionEndDate: Date,
    // Fields from user.js (updated model)
    subscriptionTier: { 
      type: String, 
      enum: ['free', 'standard', 'premium'], 
      default: 'free' 
    },
    subscriptionStart: { type: Date },
    subscriptionEnd: { type: Date },
    allowedCVs: { type: Number, default: 1 },
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
    } else if (tier === 'standard') {
      // Standard tier: 1 year
      this.subscriptionEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      this.allowedCVs = 1;
      this.hasAnalytics = false;
    } else if (tier === 'premium') {
      // Premium tier: 1 year
      this.subscriptionEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      this.allowedCVs = 3;
      this.hasAnalytics = true;
    }
  };

  try {
    // Check if model already exists
    if (mongoose.models.User) {
      User = mongoose.models.User;
    } else {
      User = mongoose.model('User', userSchema);
    }
    console.log('User model loaded or created');
  } catch (error) {
    console.error('Error initializing User model:', error);
  }
}

// Authentication services
const authService = {
  // Generate JWT token
  generateToken: (userId) => {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const JWT_EXPIRY = '24h';
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  },

  // Verify JWT token
  verifyToken: (token) => {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  },

  // Authentication middleware
  authenticateJWT: (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    console.log('JWT authentication attempt, token present:', !!token);
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }
    
    const decoded = authService.verifyToken(token);
    console.log('Token decoded:', decoded ? 'success' : 'failed');
    
    if (!decoded) {
      return res.status(401).json({ message: 'Token is invalid or expired' });
    }
    
    req.user = { id: decoded.id };
    console.log('User authenticated, id:', decoded.id);
    next();
  },

  // Web page authentication middleware (redirects to login)
  requireAuth: (req, res, next) => {
    const token = req.cookies.token;
    
    if (!token) {
      return res.redirect('/login.html?redirect=' + encodeURIComponent(req.originalUrl));
    }
    
    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      res.clearCookie('token');
      return res.redirect('/login.html?redirect=' + encodeURIComponent(req.originalUrl));
    }
    
    req.user = { id: decoded.id };
    next();
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads', { recursive: true });
    }
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Stripe webhook handling
// This is important: we need to use express.raw for the webhook route
// before applying the regular json middleware
app.post('/api/payments/webhook', 
  express.raw({type: 'application/json'}),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not configured');
      return res.status(500).send('Stripe is not configured');
    }

    let stripe;
    try {
      stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      return res.status(500).send('Error initializing Stripe');
    }

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET is not configured');
      return res.status(500).send('Webhook secret is not configured');
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      // Process the event
      console.log('Webhook event received:', event.type);
      
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
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

// Handle successful subscription
async function handleSuccessfulSubscription(session) {
  try {
    const userId = session.metadata.userId;
    const plan = session.metadata.plan;
    const subscriptionId = session.subscription;

    console.log(`Processing successful subscription: userId=${userId}, plan=${plan}, subId=${subscriptionId}`);

    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found for subscription:', userId);
      return;
    }

    user.updateSubscription(plan, subscriptionId);
    await user.save();
    console.log(`User ${userId} subscription updated to ${plan}`);
  } catch (error) {
    console.error('Error handling successful subscription:', error);
  }
}

// Handle canceled subscription
async function handleCanceledSubscription(subscription) {
  try {
    const user = await User.findOne({ subscriptionId: subscription.id });
    if (!user) {
      console.error('User not found for canceled subscription:', subscription.id);
      return;
    }

    user.updateSubscription('free', null);
    await user.save();
    console.log(`User ${user._id} subscription canceled and reverted to free tier`);
  } catch (error) {
    console.error('Error handling canceled subscription:', error);
  }
}

// Middleware - must come after webhook route
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Helper functions
async function findCVByUrlId(urlId) {
  console.log('Looking for CV with urlId:', urlId);
  
  if (useInMemoryStorage) {
    const cv = inMemoryCVs.get(urlId);
    console.log('In-memory lookup result:', cv ? 'CV found' : 'CV not found');
    return cv;
  } else {
    try {
      const cv = await CV.findOne({ urlId });
      console.log('MongoDB lookup result:', cv ? 'CV found' : 'CV not found');
      if (!cv && inMemoryCVs.has(urlId)) {
        console.log('CV found in fallback memory storage');
        return inMemoryCVs.get(urlId);
      }
      return cv;
    } catch (error) {
      console.error('Error finding CV in MongoDB:', error);
      // Try fallback to in-memory
      const cv = inMemoryCVs.get(urlId);
      console.log('Fallback in-memory lookup result:', cv ? 'CV found' : 'CV not found');
      return cv;
    }
  }
}

async function findCVByCustomUrlName(customUrlName) {
  if (useInMemoryStorage) {
    // For in-memory storage, iterate through all values
    for (const cv of inMemoryCVs.values()) {
      if (cv.customUrlName === customUrlName) {
        return cv;
      }
    }
    return null;
  } else {
    return await CV.findOne({ customUrlName });
  }
}

async function saveCV(cv) {
  console.log('Saving CV with ID:', cv.urlId);
  console.log('CV userId:', cv.userId);
  console.log('CV object fields:', Object.keys(cv));
  
  if (useInMemoryStorage) {
    console.log('Using in-memory storage');
    inMemoryCVs.set(cv.urlId, cv);
    console.log('CV saved in memory, total CVs:', inMemoryCVs.size);
    return cv;
  } else {
    if (CV) {
      console.log('Using MongoDB for storage');
      try {
        const newCV = new CV(cv);
        console.log('CV model instance created');
        const savedCV = await newCV.save();
        console.log('CV saved to MongoDB, id:', savedCV._id);
        
        // Update user's cvs array if a userId is provided
        if (cv.userId && User) {
          try {
            console.log('Updating user record with new CV');
            await User.findByIdAndUpdate(
              cv.userId,
              { $push: { cvs: savedCV._id } }
            );
            console.log('User document updated with new CV reference');
          } catch (userError) {
            console.error('Error updating user document:', userError);
          }
        }
        
        return savedCV;
      } catch (error) {
        console.error('Error saving CV to MongoDB:', error);
        // Fallback to in-memory if MongoDB save fails
        console.log('Falling back to in-memory storage for this CV');
        inMemoryCVs.set(cv.urlId, cv);
        return cv;
      }
    } else {
      console.error('CV model not initialized');
      throw new Error('CV model not initialized');
    }
  }
}

async function updateCV(cv) {
  console.log('Updating CV with ID:', cv.urlId);
  
  if (useInMemoryStorage) {
    console.log('Using in-memory storage for update');
    inMemoryCVs.set(cv.urlId, cv);
    return cv;
  } else {
    if (cv._id) {
      console.log('Updating existing MongoDB document with _id:', cv._id);
      try {
        await cv.save();
        console.log('CV updated successfully');
        return cv;
      } catch (error) {
        console.error('Error saving CV update:', error);
        throw error;
      }
    } else {
      console.log('Finding CV by urlId for update');
      const existingCV = await CV.findOne({ urlId: cv.urlId });
      if (existingCV) {
        console.log('Found existing CV with _id:', existingCV._id);
        Object.assign(existingCV, cv);
        try {
          await existingCV.save();
          console.log('CV updated successfully');
          return existingCV;
        } catch (error) {
          console.error('Error saving CV update:', error);
          throw error;
        }
      } else {
        console.error('CV not found for update');
        throw new Error('CV not found');
      }
    }
  }
}

// Text extraction function
async function extractTextFromFile(filePath, fileType) {
  console.log(`Extracting text from ${fileType} file...`);
  
  try {
    // Extract text based on file type
    if (fileType === 'application/pdf') {
      // Extract text from PDF
      const pdfBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(pdfBuffer);
      return pdfData.text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               fileType === 'application/msword') {
      // Extract text from DOC/DOCX
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    throw new Error(`Failed to extract text: ${error.message}`);
  }
}

// Function to generate custom URL names
function generateCustomUrlName(name) {
  if (!name) return null;
  
  // Convert to lowercase, replace spaces with hyphens, remove special characters
  let urlName = name.toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')             // Trim hyphens from start
    .replace(/-+$/, '');            // Trim hyphens from end
  
  // Add a random suffix to avoid collisions (4 characters)
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  urlName = `${urlName}-${randomSuffix}`;
  
  return urlName;
}

// Helper function to check if user has analytics access
async function hasAnalyticsAccess(userId) {
  try {
    if (!userId || useInMemoryStorage) return false;
    
    const user = await User.findById(userId);
    if (!user) return false;
    
    console.log(`Checking analytics access for user ${userId}: hasAnalytics=${user.hasAnalytics}`);
    return user.hasAnalytics === true;
  } catch (error) {
    console.error('Error checking analytics access:', error);
    return false;
  }
}

// Payment routes
app.post('/api/payments/create-checkout-session', authService.authenticateJWT, async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (!['standard', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }
    
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe is not configured' });
    }
    
    let stripe;
    try {
      stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      return res.status(500).json({ error: 'Error initializing payment processor' });
    }
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const PRODUCTS = {
      STANDARD: {
        price: 1000, // $10.00
        tier: 'standard'
      },
      PREMIUM: {
        price: 2900, // $29.00
        tier: 'premium'
      }
    };
    
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
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Get subscription status
app.get('/api/payments/subscription-status', authService.authenticateJWT, async (req, res) => {
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

// Verify session after return from Stripe - UPDATED FOR BETTER ERROR HANDLING
app.post('/api/payments/verify-session', authService.authenticateJWT, async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      console.log('Session verification failed: No session ID provided');
      return res.status(400).json({ success: false, error: 'Session ID is required' });
    }
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('Session verification failed: Stripe not configured');
      return res.status(500).json({ success: false, error: 'Stripe is not configured' });
    }
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    console.log(`Verifying Stripe session ${sessionId} for user ${req.user.id}`);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(`Session retrieved, payment status: ${session.payment_status}`);
    
    if (session.payment_status !== 'paid') {
      console.log('Session verification failed: Payment not completed');
      return res.json({ success: false, error: 'Payment not completed' });
    }
    
    // Verify that this is for the authenticated user
    if (!session.metadata || !session.metadata.userId) {
      console.log('Session verification failed: No userId in metadata');
      return res.status(400).json({ success: false, error: 'Invalid session metadata' });
    }
    
    if (session.metadata.userId !== req.user.id) {
      console.log(`Session verification failed: Session userId ${session.metadata.userId} does not match authenticated user ${req.user.id}`);
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    // Update user subscription if not already updated by webhook
    console.log(`Updating user ${req.user.id} subscription to ${session.metadata.plan}`);
    const user = await User.findById(req.user.id);
    
    if (!user) {
      console.log('Session verification failed: User not found');
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    if (user.subscriptionTier !== session.metadata.plan) {
      console.log(`Updating user subscription from ${user.subscriptionTier} to ${session.metadata.plan}`);
      user.updateSubscription(session.metadata.plan, session.subscription);
      await user.save();
      console.log('User subscription updated successfully');
    } else {
      console.log('User subscription already up to date');
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({ success: false, error: 'Error verifying session' });
  }
});

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if email already exists
    if (!useInMemoryStorage && User) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      // Create user
      const user = new User({ name, email, password });
      await user.save();
      
      // Generate token
      const token = authService.generateToken(user._id);
      
      // Set token in cookie
      res.cookie('token', token, { 
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      res.status(201).json({ 
        message: 'Registration successful', 
        user: { id: user._id, name: user.name, email: user.email } 
      });
    } else {
      return res.status(500).json({ message: 'User database not available' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!useInMemoryStorage && User) {
      // Find user
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Check password
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Update last login
      user.lastLogin = new Date();
      await user.save();
      
      // Generate token
      const token = authService.generateToken(user._id);
      
      // Set token in cookie
      res.cookie('token', token, { 
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      res.json({ 
        message: 'Login successful', 
        user: { id: user._id, name: user.name, email: user.email } 
      });
    } else {
      return res.status(500).json({ message: 'User database not available' });
    }
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', authService.authenticateJWT, async (req, res) => {
  try {
    if (!useInMemoryStorage && User) {
      const user = await User.findById(req.user.id).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } else {
      return res.status(500).json({ message: 'User database not available' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Auth check endpoint for client scripts
app.get('/api/auth/check', async (req, res) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.json({ authenticated: false });
  }
  
  const decoded = authService.verifyToken(token);
  
  if (!decoded) {
    return res.json({ authenticated: false });
  }
  
  res.json({ authenticated: true, userId: decoded.id });
});

// Protected dashboard route
app.get('/dashboard', authService.requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Get user's CVs 
app.get('/api/user/cvs', authService.authenticateJWT, async (req, res) => {
  try {
    console.log('Fetching CVs for user ID:', req.user.id);
    
    if (useInMemoryStorage) {
      console.log('Using in-memory storage for CV lookup');
      const userCvs = Array.from(inMemoryCVs.values())
        .filter(cv => cv.userId === req.user.id);
      
      console.log(`Found ${userCvs.length} CVs in memory for user`);
      
      const transformedCvs = userCvs.map(({ urlId, customUrlName, fileName, uploadDate, html }) => ({ 
        urlId, customUrlName, fileName, uploadDate, hasHtml: !!html 
      }));
      
      res.json(transformedCvs);
    } else {
      console.log('Using MongoDB for CV lookup');
      const cvs = await CV.find({ userId: req.user.id })
        .select('urlId customUrlName fileName uploadDate html')
        .sort({ uploadDate: -1 });
      
      console.log(`Found ${cvs.length} CVs in MongoDB for user`);
      
      // Transform to include hasHtml property instead of the full HTML
      const transformedCvs = cvs.map(cv => ({
        urlId: cv.urlId,
        customUrlName: cv.customUrlName,
        fileName: cv.fileName,
        uploadDate: cv.uploadDate,
        hasHtml: !!cv.html
      }));
      
      res.json(transformedCvs);
    }
  } catch (error) {
    console.error('Error fetching user CVs:', error);
    res.status(500).json({ error: 'Error fetching user CVs' });
  }
});

// Get count of user's CVs
app.get('/api/cvs/count', authService.authenticateJWT, async (req, res) => {
  try {
    let count = 0;
    
    if (useInMemoryStorage) {
      count = Array.from(inMemoryCVs.values())
        .filter(cv => cv.userId === req.user.id)
        .length;
    } else {
      count = await CV.countDocuments({ userId: req.user.id });
    }
    
    res.json({ count });
  } catch (error) {
    console.error('Error counting CVs:', error);
    res.status(500).json({ error: 'Error counting CVs' });
  }
});

// Analytics routes
app.post('/api/analytics/cv/:urlId/view', async (req, res) => {
  try {
    const cv = await findCVByUrlId(req.params.urlId);
    
    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }
    
    // Increment view count
    cv.views = (cv.views || 0) + 1;
    cv.lastViewed = new Date();
    await updateCV(cv);
    
    return res.status(200).json({ success: true, views: cv.views });
  } catch (error) {
    console.error('Error tracking view:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/analytics/cv/:urlId/section/:sectionId', async (req, res) => {
  try {
    const { urlId, sectionId } = req.params;
    const { sectionTitle } = req.body;
    
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }
    
    // Initialize sectionInteractions if it doesn't exist
    if (!cv.sectionInteractions) {
      cv.sectionInteractions = [];
    }
    
    // Find if this section was already clicked before
    const existingInteraction = cv.sectionInteractions.find(
      interaction => interaction.sectionId === sectionId
    );
    
    if (existingInteraction) {
      // Increment existing section's click count
      existingInteraction.clicks += 1;
      existingInteraction.lastClicked = new Date();
    } else {
      // Add new section interaction
      cv.sectionInteractions.push({
        sectionId,
        sectionTitle: sectionTitle || `Section ${sectionId}`,
        clicks: 1,
        lastClicked: new Date()
      });
    }
    
    await updateCV(cv);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking section click:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Track detailed section interactions - NEW ENDPOINT
app.post('/api/analytics/cv/:urlId/section-interaction', async (req, res) => {
  try {
    const { urlId } = req.params;
    const { sectionId, sectionTitle, sectionType, action } = req.body;
    
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }
    
    // Initialize interactions array if it doesn't exist
    if (!cv.sectionInteractions) {
      cv.sectionInteractions = [];
    }
    
    // Find if this section was already interacted with
    let interaction = cv.sectionInteractions.find(
      item => item.sectionId === sectionId
    );
    
    if (interaction) {
      // Update existing interaction
      interaction.clicks += 1;
      interaction.lastClicked = new Date();
    } else {
      // Add new interaction
      cv.sectionInteractions.push({
        sectionId,
        sectionTitle,
        sectionType,
        clicks: 1,
        lastClicked: new Date()
      });
    }
    
    await updateCV(cv);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking section interaction:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get analytics for a specific CV - UPDATED TO CHECK SUBSCRIPTION
app.get('/api/analytics/cv/:urlId', authService.authenticateJWT, async (req, res) => {
  try {
    const cv = await findCVByUrlId(req.params.urlId);
    
    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }
    
    // Check if user owns this CV
    if (cv.userId && cv.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this CV' });
    }
    
    // Check if user has analytics access
    const hasAccess = await hasAnalyticsAccess(req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({ 
        message: 'Analytics access requires premium subscription',
        requiresUpgrade: true
      });
    }
    
    return res.status(200).json({
      id: cv.urlId,
      title: cv.fileName || 'Untitled CV',
      views: cv.views || 0,
      sectionInteractions: cv.sectionInteractions || [],
      lastViewed: cv.lastViewed
    });
  } catch (error) {
    console.error('Error fetching CV analytics:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get analytics for all user's CVs - UPDATED TO CHECK SUBSCRIPTION
app.get('/api/analytics/user', authService.authenticateJWT, async (req, res) => {
  try {
    // Check if user has analytics access
    const hasAccess = await hasAnalyticsAccess(req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({ 
        message: 'Analytics access requires premium subscription',
        requiresUpgrade: true
      });
    }
    
    if (useInMemoryStorage) {
      // For in-memory storage, filter CVs by userId
      const userCvs = Array.from(inMemoryCVs.values())
        .filter(cv => cv.userId === req.user.id)
        .map(cv => ({
          id: cv.urlId,
          title: cv.fileName || 'Untitled CV',
          views: cv.views || 0,
          interactionCount: (cv.sectionInteractions || []).reduce((sum, section) => sum + section.clicks, 0),
          lastViewed: cv.lastViewed
        }));
      
      return res.status(200).json(userCvs);
    } else {
      // For MongoDB, find CVs by userId
      const cvs = await CV.find({ userId: req.user.id })
        .select('urlId fileName views sectionInteractions lastViewed customUrlName')
        .sort({ uploadDate: -1 });
      
      const analytics = cvs.map(cv => ({
        id: cv.urlId,
        title: cv.fileName || 'Untitled CV',
        views: cv.views || 0,
        customUrl: cv.customUrlName,
        interactionCount: (cv.sectionInteractions || []).reduce((sum, section) => sum + (section.clicks || 0), 0),
        lastViewed: cv.lastViewed
      }));
      
      return res.status(200).json(analytics);
    }
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// API Routes
// Upload route - Extract structured data only, no HTML - FIXED
app.post('/api/upload', authService.authenticateJWT, upload.single('cvFile'), async (req, res) => {
  try {
    console.log('Upload request from user ID:', req.user.id);
    
    // Check user's CV quota before allowing upload
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get the user's current CV count
    let currentCVCount = 0;
    if (useInMemoryStorage) {
      currentCVCount = Array.from(inMemoryCVs.values())
        .filter(cv => cv.userId === req.user.id)
        .length;
    } else {
      currentCVCount = await CV.countDocuments({ userId: req.user.id });
    }
    
    console.log(`User ${req.user.id} has ${currentCVCount} CVs, allowed: ${user.allowedCVs}`);
    
    // Check if user has reached their quota
    if (currentCVCount >= user.allowedCVs) {
      return res.status(403).json({ 
        error: 'CV quota exceeded',
        message: `Your subscription allows a maximum of ${user.allowedCVs} CV(s). Please upgrade your plan or delete an existing CV.`,
        requiresUpgrade: true,
        currentCount: currentCVCount,
        maxAllowed: user.allowedCVs
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log(`File upload attempted: ${req.file.originalname} (${req.file.mimetype})`);
    console.log(`File uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
    
    // Generate a unique URL ID for the CV
    const urlId = uuidv4();
    console.log(`Generated URL ID: ${urlId}`);
    
    // Extract text from the uploaded file
    const filePath = req.file.path;
    const extractedText = await extractTextFromFile(filePath, req.file.mimetype);
    console.log(`Extracted ${extractedText.length} characters of text from file`);
    
    // Use the data extraction service
    const structuredData = await dataExtractionService.extractStructuredData(
      extractedText,
      process.env.ANTHROPIC_API_KEY,
      process.env.ANTHROPIC_MODEL
    );
    
    console.log('Claude successfully extracted structured data');
    
    // Generate a custom URL name from the person's name
    const customUrlName = generateCustomUrlName(structuredData.personalInfo?.name);
    console.log(`Generated custom URL name: ${customUrlName}`);
    
    // Create CV object with structured data and custom URL
    const cv = {
      urlId,
      customUrlName,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      structuredData,
      uploadDate: new Date(),
      html: null, // We'll generate this later when user requests it
      userId: req.user.id, // Now explicitly set from req.user.id
      views: 0,  // Initialize analytics fields
      sectionInteractions: []
    };
    
    console.log('Created CV object with userId:', cv.userId);
    
    // Save CV to storage
    const savedCV = await saveCV(cv);
    console.log(`CV saved with success:`, !!savedCV);
    
    // Return success with redirect URL and custom URL
    res.json({
      success: true,
      message: 'CV uploaded and data extracted successfully',
      urlId,
      customUrlName,
      redirectUrl: `/cv-editor.html?id=${urlId}`,
      customUrl: `/${customUrlName}`
    });
    
  } catch (error) {
    console.error('Error uploading CV:', error);
    res.status(500).json({ error: 'Error uploading CV: ' + error.message });
  }
});

// PDF generation endpoint
app.get('/api/cv/:urlId/pdf', async (req, res) => {
  try {
    const urlId = req.params.urlId;
    const cv = await findCVByUrlId(urlId);
    
    if (!cv || !cv.html) {
      return res.status(404).send('CV not found or HTML not yet generated');
    }
    
    // Launch puppeteer
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // For some environments like Docker
    });
    const page = await browser.newPage();
    
    // Create a temporary HTML with the CV
    const tempHtml = cv.html.replace('</head>', `
      <style>
        @media print {
          body { background-color: white !important; }
          .page { margin: 0 !important; max-width: 100% !important; }
          
          /* Ensure all expandable sections are visible */
          .achievement-content {
            max-height: none !important;
            padding: 0 16px 16px !important;
            display: block !important;
          }
          
          .achievement-toggle { display: none !important; }
          
          /* Ensure all elements appear */
          .achievement-item {
            opacity: 1 !important;
            transform: none !important;
          }
          
          .metric-card {
            opacity: 1 !important;
            transform: none !important;
          }
          
          .progress-fill {
            width: var(--data-width) !important;
          }
          
          .cv-template-footer { display: none !important; }
        }
      </style>
    </head>`);
    
    // Set content and wait for it to load
    await page.setContent(tempHtml, { waitUntil: 'networkidle0' });
    
    // Activate all expandable sections
    await page.evaluate(() => {
      document.querySelectorAll('.achievement-item').forEach(item => {
        item.classList.add('active');
      });
    });
    
    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
    });
    
    await browser.close();
    
    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${cv.fileName || 'cv'}.pdf"`);
    
    // Send the PDF
    res.send(pdf);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Error generating PDF');
  }
});

// Add CV Metadata API Endpoint
app.get('/api/cv-meta/:urlId', async (req, res) => {
  try {
    const urlId = req.params.urlId;
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }
    
    // Return only metadata (not the full structuredData or HTML)
    res.json({
      urlId: cv.urlId,
      customUrlName: cv.customUrlName,
      hasHtml: !!cv.html,
      fileName: cv.fileName,
      uploadDate: cv.uploadDate
    });
  } catch (error) {
    console.error('Error fetching CV metadata:', error);
    res.status(500).json({ error: 'Error fetching CV metadata' });
  }
});

// Get CV data for editing
app.get('/api/cv/:urlId', async (req, res) => {
  try {
    const urlId = req.params.urlId;
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }
    
    res.json(cv.structuredData);
  } catch (error) {
    console.error('Error fetching CV data:', error);
    res.status(500).json({ error: 'Error fetching CV data' });
  }
});

// Save edited CV data
app.post('/api/cv/:urlId', async (req, res) => {
  try {
    const urlId = req.params.urlId;
    const updatedData = req.body;
    
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }
    
    // Update structured data only
    cv.structuredData = updatedData;
    await updateCV(cv);
    
    res.json({ success: true, message: 'CV data saved successfully' });
  } catch (error) {
    console.error('Error saving CV data:', error);
    res.status(500).json({ error: 'Error saving CV data' });
  }
});

// Generate HTML from structured data
app.post('/api/generate-html/:urlId', async (req, res) => {
  try {
    const urlId = req.params.urlId;
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }
    
    console.log(`Generating HTML for CV: ${urlId}`);
    
    // Generate HTML using template service
    const html = await templateService.generateCvHtml(
      cv, 
      process.env.ANTHROPIC_API_KEY,
      process.env.ANTHROPIC_MODEL
    );
    
    // Update CV with generated HTML
    cv.html = html;
    await updateCV(cv);
    console.log(`Generated HTML CV (${html.length} bytes)`);
    
    // Return success with redirect URL and custom URL
    res.json({
      success: true,
      message: 'HTML generated successfully',
      viewUrl: `/view-cv/${urlId}`,
      customUrl: cv.customUrlName ? `/${cv.customUrlName}` : null
    });
  } catch (error) {
    console.error('Error generating HTML:', error);
    res.status(500).json({ error: 'Error generating HTML: ' + error.message });
  }
});

// View generated CV
app.get('/view-cv/:urlId', async (req, res) => {
  try {
    const urlId = req.params.urlId;
    const cv = await findCVByUrlId(urlId);
    
    if (!cv || !cv.html) {
      return res.status(404).send('CV not found or HTML not yet generated');
    }
    
    // Increment view counter directly here as well
    cv.views = (cv.views || 0) + 1;
    cv.lastViewed = new Date();
    await updateCV(cv);
    
    res.send(cv.html);
  } catch (error) {
    console.error('Error viewing CV:', error);
    res.status(500).send('Error viewing CV. Please try again.');
  }
});

// Delete CV endpoint
app.delete('/api/cv/:urlId', authService.authenticateJWT, async (req, res) => {
  try {
    const urlId = req.params.urlId;
    console.log(`Delete request for CV with urlId: ${urlId} from user: ${req.user.id}`);
    
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }
    
    // Verify the user owns this CV
    if (cv.userId && cv.userId.toString() !== req.user.id) {
      console.log('Unauthorized delete attempt: CV belongs to', cv.userId, 'but request from', req.user.id);
      return res.status(403).json({ error: 'You do not have permission to delete this CV' });
    }
    
    // Remove the CV reference from the user's cvs array
    if (!useInMemoryStorage && User) {
      console.log('Removing CV reference from user document');
      await User.findByIdAndUpdate(
        req.user.id,
        { $pull: { cvs: cv._id } }
      );
    }
    
    // Delete the CV
    if (useInMemoryStorage) {
      console.log('Deleting CV from in-memory storage');
      inMemoryCVs.delete(urlId);
    } else {
      console.log('Deleting CV from MongoDB');
      await CV.deleteOne({ urlId: urlId });
    }
    
    console.log(`CV ${urlId} successfully deleted`);
    return res.status(200).json({ success: true, message: 'CV deleted successfully' });
  } catch (error) {
    console.error('Error deleting CV:', error);
    return res.status(500).json({ error: 'Error deleting CV' });
  }
});

// NEW SUCCESS PAGE ROUTE - UPDATED WITH BETTER ERROR HANDLING
app.get('/success', (req, res) => {
  // Log the query parameters for debugging
  console.log('Success page requested with query params:', req.query);
  
  const sessionId = req.query.session_id;
  
  if (!sessionId) {
    console.log('No session_id provided, redirecting to pricing');
    return res.redirect('/pricing');
  }
  
  // Just serve the success.html page - the client-side JS will handle verification
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

// Custom URL route - Add this new route before app.listen()
app.get('/:customUrlName', async (req, res, next) => {
  try {
    const customUrlName = req.params.customUrlName;
    
    // Skip for known routes and static files
    if (['api', 'uploads', 'view-cv', 'cv-editor.html', 'index.html', 'login.html', 'register.html', 'dashboard', 'success', 'pricing'].includes(customUrlName) ||
        customUrlName.includes('.')) {
      return next();
    }
    
    console.log(`Custom URL request for: ${customUrlName}`);
    
    // Look up CV by custom URL name
    const cv = await findCVByCustomUrlName(customUrlName);
    
    if (!cv) {
      console.log(`No CV found for custom URL: ${customUrlName}`);
      return res.status(404).send('CV not found');
    }
    
    // Check if HTML is generated
    if (!cv.html) {
      console.log(`HTML not yet generated for CV: ${cv.urlId}`);
      // Redirect to editor if HTML not generated
      return res.redirect(`/cv-editor.html?id=${cv.urlId}`);
    }
    
    // Increment view counter
    cv.views = (cv.views || 0) + 1;
    cv.lastViewed = new Date(); 
    await updateCV(cv);
    
    // Send the HTML CV
    console.log(`Serving CV with custom URL: ${customUrlName}`);
    res.send(cv.html);
  } catch (error) {
    console.error('Error accessing custom URL CV:', error);
    res.status(500).send('Error accessing CV. Please try again.');
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Upload a CV at: http://localhost:${port}`);
});