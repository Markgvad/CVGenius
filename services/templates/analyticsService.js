// services/analyticsService.js
const CV = require('../models/cv');

exports.getCvAnalytics = async (cvId) => {
  const cv = await CV.findOne({ urlId: cvId });
  if (!cv) throw new Error('CV not found');
  
  return {
    views: cv.views || 0,
    lastViewed: cv.lastViewed,
    sectionInteractions: cv.sectionInteractions || []
  };
};

exports.getAllUserCvAnalytics = async (userId) => {
  const cvs = await CV.find({ userId })
    .select('urlId fileName views sectionInteractions lastViewed');
  
  return cvs.map(cv => ({
    id: cv.urlId,
    title: cv.fileName,
    views: cv.views || 0,
    interactionCount: (cv.sectionInteractions || []).reduce((sum, section) => sum + section.clicks, 0),
    mostClickedSection: getMostClickedSection(cv.sectionInteractions),
    lastViewed: cv.lastViewed
  }));
};

function getMostClickedSection(sections = []) {
  if (!sections.length) return null;
  
  return sections.reduce((max, section) => 
    section.clicks > max.clicks ? section : max, sections[0]);
}