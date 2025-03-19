// config/env.js
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Load environment variables
const loadEnv = () => {
  // First try to load from .env file
  dotenv.config();
  
  // Check for required environment variables
  const requiredVars = [
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'ANTHROPIC_API_KEY'
  ];
  
  // Log missing variables (but don't fail)
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      logger.warn(`WARNING: ${varName} is not set in environment`);
    } else {
      logger.info(`${varName}: Found`);
    }
  });
  
  // Ensure critical variables have fallbacks (for development only)
  if (!process.env.JWT_SECRET) {
    logger.warn('Using development JWT_SECRET. This should be properly set in production.');
    process.env.JWT_SECRET = 'dev-jwt-secret-change-in-production';
  }
  
  // Set default Anthropic model if not specified
  if (!process.env.ANTHROPIC_MODEL) {
    process.env.ANTHROPIC_MODEL = 'claude-3-7-sonnet-20250219';
    logger.info(`Using default Anthropic model: ${process.env.ANTHROPIC_MODEL}`);
  }
  
  // MCP Configuration
  if (!process.env.USE_MCP) {
    process.env.USE_MCP = 'false'; // Default to not using MCP
    logger.info('MCP usage not configured, defaulting to direct API calls');
  } else if (process.env.USE_MCP === 'true') {
    logger.info('MCP is enabled - will use MCP for AI interactions');
    
    // Check for MCP server URL
    if (!process.env.MCP_SERVER_URL) {
      process.env.MCP_SERVER_URL = 'http://localhost:5001';
      logger.info(`Using default MCP server URL: ${process.env.MCP_SERVER_URL}`);
    } else {
      logger.info(`Using MCP server at: ${process.env.MCP_SERVER_URL}`);
    }
    
    // Optional MCP authentication token
    if (process.env.MCP_AUTH_TOKEN) {
      logger.info('MCP authentication token is configured');
    }
  }
  
  // Google Cloud Storage Configuration
  if (!process.env.USE_GCS) {
    process.env.USE_GCS = 'true'; // Default to using GCS
    logger.info('GCS usage configured, defaulting to enabled');
  }
  
  if (process.env.USE_GCS === 'true') {
    logger.info('Google Cloud Storage is enabled for file uploads');
    
    // Set default GCS bucket name if not specified
    if (!process.env.GCS_BUCKET_NAME) {
      process.env.GCS_BUCKET_NAME = 'finalcv-uploads';
      logger.info(`Using default GCS bucket name: ${process.env.GCS_BUCKET_NAME}`);
    }
    
    // Set default GCS project ID if not specified
    if (!process.env.GCS_PROJECT_ID) {
      logger.warn('GCS_PROJECT_ID is not set - will attempt to use default application credentials');
    } else {
      logger.info(`Using GCS project ID: ${process.env.GCS_PROJECT_ID}`);
    }
  } else {
    logger.info('Google Cloud Storage is disabled - using local disk storage');
  }
};

module.exports = { loadEnv };