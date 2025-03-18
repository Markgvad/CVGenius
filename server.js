// server.js
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const fs = require('fs');

// Load configuration
require('./config/env').loadEnv();
const db = require('./config/db');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Ensure uploads directories exist with absolute paths
const uploadBaseDir = path.join(__dirname, 'uploads');
const uploadProfileDir = path.join(__dirname, 'uploads/profile-pictures');

// Create directories if they don't exist
[uploadBaseDir, uploadProfileDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    logger.info(`Created directory: ${dir}`);
  }
});

// Export these paths for use in other modules
global.uploadPaths = {
  base: uploadBaseDir,
  profilePictures: uploadProfileDir
};

// Routes
const authRoutes = require('./routes/auth');
const cvRoutes = require('./routes/cv');
const paymentRoutes = require('./routes/payment');
const analyticsRoutes = require('./routes/analytics');

// Initialize express
const app = express();
const port = process.env.PORT || 5000;

// Special route for Stripe webhooks - must be before other middleware
app.post('/api/payments/webhook', 
  express.raw({ type: 'application/json' }),
  require('./controllers/paymentController').handleWebhook
);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static('public'));

// Configure static file serving for uploads
app.use('/uploads', express.static(uploadBaseDir)); 
app.use('/uploads/profile-pictures', express.static(uploadProfileDir));

// Log upload directories for debugging
logger.info(`Serving uploads from: ${uploadBaseDir}`);
logger.info(`Serving profile pictures from: ${uploadProfileDir}`);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/cvgenius' 
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Connect to database
db.connect()
  .then(connected => {
    // Initialize any application state that depends on database connection
    logger.info(connected ? 
      'Database connected, using persistent storage' : 
      'Database connection failed, using fallback in-memory storage'
    );
  });

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);

// Route for viewing generated CVs
app.get('/view-cv/:urlId', require('./controllers/cvController').viewCV);

// Custom URL route - should come before other routes to handle custom CV URLs
app.use('/:customUrlName', require('./controllers/cvController').handleCustomUrl);

// Protected dashboard route
app.get('/dashboard', require('./middleware/auth').requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Success page for payment returns
app.get('/success', require('./controllers/paymentController').handleSuccessPage);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
  const serverUrl = process.env.NODE_ENV === 'production' ? process.env.DOMAIN : `http://localhost:${port}`;
  logger.info(`Upload a CV at: ${serverUrl}`);
});