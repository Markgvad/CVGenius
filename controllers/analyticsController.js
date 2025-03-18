// controllers/analyticsController.js
const logger = require('../utils/logger');
const cvController = require('../controllers/cvController');
const { findCVByUrlId, updateCV, hasAnalyticsAccess } = cvController._internal;

/**
 * Track CV view
 */
exports.trackView = async (req, res) => {
  try {
    const cv = await findCVByUrlId(req.params.urlId);
    
    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }
    
    // Increment view count
    cv.views = (cv.views || 0) + 1;
    cv.lastViewed = new Date();
    await updateCV(cv);
    
    return res.status(200).json({ success: true, views: cv.views });
  } catch (error) {
    logger.error('Error tracking view:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Track section interaction
 */
exports.trackSectionInteraction = async (req, res) => {
  try {
    const { urlId, sectionId } = req.params;
    const { sectionTitle } = req.body;
    
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }
    
    // Initialize sectionInteractions if it doesn't exist
    if (!cv.sectionInteractions) {
      cv.sectionInteractions = [];
    }
    
    // Find if this section was already clicked before
    const existingInteraction = cv.sectionInteractions.find(
      interaction => interaction.sectionId === sectionId
    );
    
    if (existingInteraction) {
      // Increment existing section's click count
      existingInteraction.clicks += 1;
      existingInteraction.lastClicked = new Date();
    } else {
      // Add new section interaction
      cv.sectionInteractions.push({
        sectionId,
        sectionTitle: sectionTitle || `Section ${sectionId}`,
        clicks: 1,
        lastClicked: new Date()
      });
    }
    
    await updateCV(cv);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error tracking section click:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Track detailed section interactions
 */
exports.trackDetailedInteraction = async (req, res) => {
  try {
    const { urlId } = req.params;
    const { sectionId, sectionTitle, sectionType, action } = req.body;
    
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }
    
    // Initialize interactions array if it doesn't exist
    if (!cv.sectionInteractions) {
      cv.sectionInteractions = [];
    }
    
    // Find if this section was already interacted with
    let interaction = cv.sectionInteractions.find(
      item => item.sectionId === sectionId
    );
    
    if (interaction) {
      // Update existing interaction
      interaction.clicks += 1;
      interaction.lastClicked = new Date();
    } else {
      // Add new interaction
      cv.sectionInteractions.push({
        sectionId,
        sectionTitle,
        sectionType,
        clicks: 1,
        lastClicked: new Date()
      });
    }
    
    await updateCV(cv);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error tracking section interaction:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get analytics for a specific CV
 */
exports.getCVAnalytics = async (req, res) => {
  try {
    const cv = await findCVByUrlId(req.params.urlId);
    
    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }
    
    // Check if user owns this CV
    if (cv.userId && cv.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this CV' });
    }
    
    // Check if user has analytics access
    const hasAccess = await hasAnalyticsAccess(req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({ 
        message: 'Analytics access requires premium subscription',
        requiresUpgrade: true
      });
    }
    
    return res.status(200).json({
      id: cv.urlId,
      title: cv.fileName || 'Untitled CV',
      views: cv.views || 0,
      sectionInteractions: cv.sectionInteractions || [],
      lastViewed: cv.lastViewed
    });
  } catch (error) {
    logger.error('Error fetching CV analytics:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get analytics for all user's CVs
 */
exports.getUserAnalytics = async (req, res) => {
  try {
    // Check if user has analytics access
    const hasAccess = await hasAnalyticsAccess(req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({ 
        message: 'Analytics access requires premium subscription',
        requiresUpgrade: true
      });
    }
    
    const CV = require('../models/cv');
    const useInMemoryStorage = cvController._internal.useInMemoryStorage;
    
    if (useInMemoryStorage) {
      // For in-memory storage, filter CVs by userId
      const userCvs = Array.from(cvController._internal.inMemoryCVs.values())
        .filter(cv => cv.userId === req.user.id)
        .map(cv => ({
          id: cv.urlId,
          title: cv.fileName || 'Untitled CV',
          views: cv.views || 0,
          interactionCount: (cv.sectionInteractions || []).reduce((sum, section) => sum + section.clicks, 0),
          lastViewed: cv.lastViewed
        }));
      
      return res.status(200).json(userCvs);
    } else {
      // For MongoDB, find CVs by userId
      const cvs = await CV.find({ userId: req.user.id })
        .select('urlId fileName views sectionInteractions lastViewed customUrlName')
        .sort({ uploadDate: -1 });
      
      const analytics = cvs.map(cv => ({
        id: cv.urlId,
        title: cv.fileName || 'Untitled CV',
        views: cv.views || 0,
        customUrl: cv.customUrlName,
        interactionCount: (cv.sectionInteractions || []).reduce((sum, section) => sum + (section.clicks || 0), 0),
        lastViewed: cv.lastViewed
      }));
      
      return res.status(200).json(analytics);
    }
  } catch (error) {
    logger.error('Error fetching user analytics:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};