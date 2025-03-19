// server.js
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const fs = require('fs');

// Ensure temp upload directory exists - handle both dev and production environments
const rootDir = process.env.NODE_ENV === 'production' ? 
  '/opt/render/project/src' :  // Production path on Render
  __dirname; // Development path
const tempDir = path.join(rootDir, 'temp-uploads');

try {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log(`Created temporary upload directory: ${tempDir}`);
  }
  
  // Verify permissions by writing a test file
  const testFilePath = path.join(tempDir, '.write-test');
  fs.writeFileSync(testFilePath, 'Test write permissions');
  fs.unlinkSync(testFilePath);
  console.log(`Temp directory ${tempDir} is writable`);
} catch (dirError) {
  console.error(`Error with temp directory ${tempDir}:`, dirError.message);
  // Try alternative temp directory
  const altTempDir = path.join(process.env.TEMP || '/tmp', 'cvgenius-uploads');
  console.log(`Trying alternative temp directory: ${altTempDir}`);
  
  if (!fs.existsSync(altTempDir)) {
    fs.mkdirSync(altTempDir, { recursive: true });
  }
  console.log(`Created alternative temporary upload directory: ${altTempDir}`);
  
  // Set environment variable to inform other parts of the app
  process.env.CV_TEMP_DIR = altTempDir;
}

// Log the resolved path for debugging
console.log(`Temporary upload directory resolved path: ${path.resolve(tempDir)}`);
console.log(`Current working directory: ${process.cwd()}`);

// Load configuration
require('./config/env').loadEnv();
const db = require('./config/db');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads')); // Serve uploaded files

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