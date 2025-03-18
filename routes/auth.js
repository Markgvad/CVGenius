// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');

// Register new user
router.post('/register', authController.register);

// Login user
router.post('/login', authController.login);

// Logout user
router.post('/logout', authController.logout);

// Get current user profile (protected)
router.get('/me', authenticateJWT, authController.getCurrentUser);

// Check authentication status
router.get('/check', authController.checkAuth);

module.exports = router;