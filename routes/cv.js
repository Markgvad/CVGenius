// routes/cv.js
const express = require('express');
const router = express.Router();
const cvController = require('../controllers/cvController');
const { authenticateJWT } = require('../middleware/auth');
const { handleGCSUpload } = require('../middleware/gcsUpload');

// Upload a new CV
router.post(
  '/upload', 
  authenticateJWT, 
  cvController.upload.single('cvFile'), 
  handleGCSUpload('cvs'),
  cvController.uploadCV
);

// Upload profile picture
router.post(
  '/upload-profile-picture', 
  cvController.imageUpload.single('profileImage'), 
  handleGCSUpload('profile-pictures'),
  cvController.uploadProfilePicture
);

// Get CV data for editing
router.get('/:urlId', cvController.getCVData);

// Save edited CV data
router.post('/:urlId', cvController.updateCVData);

// Generate HTML from structured data
router.post('/generate-html/:urlId', cvController.generateHTML);

// View generated CV
router.get('/view/:urlId', cvController.viewCV);

// View placeholder page
router.get('/placeholder/:urlId', cvController.viewPlaceholderPage);

// Get CV metadata
router.get('/meta/:urlId', cvController.getCVMetadata);

// Delete CV
router.delete('/:urlId', authenticateJWT, cvController.deleteCV);

// Generate PDF
router.get('/:urlId/pdf', cvController.generatePDF);

// Get user's CVs
router.get('/user/cvs', authenticateJWT, cvController.getUserCVs);

// Get count of user's CVs
router.get('/user/count', authenticateJWT, cvController.getUserCVCount);

// Reprocess CV to detect language (admin only)
router.post('/:urlId/reprocess-language', authenticateJWT, cvController.reprocessCVLanguage);

// Repair CV data structure (admin only)
router.post('/:urlId/repair-structure', authenticateJWT, cvController.repairCVStructure);

module.exports = router;