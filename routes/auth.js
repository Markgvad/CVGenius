const express = require('express');
const router = express.Router();
const authService = require('../services/auth');
const User = require('../models/user');

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Create user
    const user = await authService.registerUser({ name, email, password });
    
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
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Authenticate user
    const user = await authService.loginUser(email, password);
    
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
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user info
router.get('/me', authService.authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;