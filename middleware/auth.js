// middleware/auth.js
const jwtService = require('../services/auth/jwtService');
const logger = require('../utils/logger');

/**
 * Middleware to authenticate API requests using JWT
 */
const authenticateJWT = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  
  logger.debug('JWT authentication attempt, token present:', !!token);
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided, authorization denied' });
  }
  
  const decoded = jwtService.verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
  
  req.user = { id: decoded.id };
  logger.debug('User authenticated, id:', decoded.id);
  next();
};

/**
 * Middleware for protecting web pages (redirects to login)
 */
const requireAuth = (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.redirect('/login.html?redirect=' + encodeURIComponent(req.originalUrl));
  }
  
  const decoded = jwtService.verifyToken(token);
  
  if (!decoded) {
    res.clearCookie('token');
    return res.redirect('/login.html?redirect=' + encodeURIComponent(req.originalUrl));
  }
  
  req.user = { id: decoded.id };
  next();
};

module.exports = {
  authenticateJWT,
  requireAuth
};