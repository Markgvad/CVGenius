// services/auth/jwtService.js
const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger');

// Get JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = '24h';

/**
 * Generate JWT token for user
 * @param {String} userId - User ID to encode in token
 * @returns {String} - JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object|null} - Decoded token payload or null if invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.debug('Token verification failed:', error.message);
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken
};