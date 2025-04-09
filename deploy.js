// deploy.js - Pre-deployment verification script
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

// Check required files exist
const requiredFiles = [
  '.env',
  'server.js',
  'start.sh',
  'render.yaml',
  'package.json'
];

logger.info('=== Checking required files for deployment ===');
const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(__dirname, file)));

if (missingFiles.length > 0) {
  logger.error('Missing required files:', missingFiles);
  process.exit(1);
}

logger.info('✅ All required files present');

// Check uploads directory exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  logger.info('Creating uploads directory...');
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

logger.info('✅ Uploads directory ready');

// Check for environment variables in .env
logger.info('Checking .env configuration...');
require('./config/env').loadEnv();

// Verification complete
logger.info('=== Deployment verification complete ===');
logger.info('Your application is ready for deployment to Render.com');
logger.info('Follow the instructions in README.md for deployment steps');