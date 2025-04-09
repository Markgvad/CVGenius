// routes/analytics.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateJWT } = require('../middleware/auth');

// Track CV view
router.post('/cv/:urlId/view', analyticsController.trackView);

// Track section interaction
router.post('/cv/:urlId/section/:sectionId', analyticsController.trackSectionInteraction);

// Track detailed section interaction
router.post('/cv/:urlId/section-interaction', analyticsController.trackDetailedInteraction);

// Get analytics for a specific CV
router.get('/cv/:urlId', authenticateJWT, analyticsController.getCVAnalytics);

// Get analytics for all user's CVs
router.get('/user', authenticateJWT, analyticsController.getUserAnalytics);

module.exports = router;