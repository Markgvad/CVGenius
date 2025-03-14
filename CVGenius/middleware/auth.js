const authService = require('../services/auth');

exports.authenticateJWT = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided, authorization denied' });
  }
  
  const decoded = authService.verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ message: 'Token is invalid or expired' });
  }
  
  req.user = { id: decoded.id };
  next();
};

// For protecting web pages (redirects to login)
exports.requireAuth = (req, res, next) => {
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
};