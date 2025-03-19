// middleware/gcsUpload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const gcsService = require('../services/storage/gcsService');

/**
 * Use local or GCS storage based on environment configuration
 */
const useGCS = process.env.USE_GCS === 'true';

/**
 * Configure multer for temporary local file storage
 * Files will be uploaded to GCS after being saved locally
 */
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use absolute path for more reliability - ensuring we use the same path as in server.js
    const rootDir = path.resolve(path.join(__dirname, '..'));
    const tempDir = path.join(rootDir, 'temp-uploads');
    // Log the absolute path for debugging
    logger.info(`Temp directory absolute path: ${path.resolve(tempDir)}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      logger.info(`Created temporary upload directory: ${tempDir}`);
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniquePrefix + path.extname(file.originalname);
    logger.debug(`Generated filename for upload: ${filename}`);
    cb(null, filename);
  }
});

/**
 * Configure file filters for various upload types
 */
const cvFileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
  }
};

const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
  }
};

/**
 * Create multer instances for CV and image uploads
 */
const cvUpload = multer({
  storage: tempStorage,
  fileFilter: cvFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const imageUpload = multer({
  storage: tempStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit for images
});

/**
 * GCS Upload middleware
 * Uploads file to Google Cloud Storage after local multer processing
 * @param {string} folder - The folder within the bucket where files will be stored
 * @returns {Function} - Express middleware that processes the upload
 */
const handleGCSUpload = (folder) => {
  return async (req, res, next) => {
    try {
      // Skip GCS upload if disabled or no file was uploaded
      if (!useGCS || !req.file) {
        return next();
      }
      
      logger.debug(`Uploading file to GCS in folder: ${folder}`);
      
      // Check if the file exists on disk
      if (req.file.path && fs.existsSync(req.file.path)) {
        logger.debug(`File exists at path: ${req.file.path}`);
        
        try {
          // Upload the file to GCS
          const result = await gcsService.uploadFile(req.file, folder, true); // Set keepLocalFile to true
          
          // Update req.file with GCS information
          req.file.gcs = result;
          req.file.publicUrl = result.signedUrl || result.publicUrl;
          
          // Store the original filename to help with deduplication
          req.file.originalGcsFilename = result.filename;
          
          logger.info(`Middleware successfully uploaded file to GCS: ${folder}/${result.filename}`);
          logger.info(`GCS URL: ${req.file.publicUrl}`);
        } catch (uploadError) {
          logger.error(`GCS upload failed in middleware: ${uploadError.message}`);
          // Continue despite the error - the controller will handle it
        }
      } else {
        logger.warn(`File not found at path: ${req.file.path} - skipping GCS upload in middleware`);
        // Continue - the controller may be able to handle this
      }
      
      // Continue middleware chain regardless of success
      // This way the controller can try as a backup
      next();
    } catch (error) {
      logger.error('Error in GCS upload middleware:', error);
      // Don't fail the request on upload error - let the controller handle it
      next();
    }
  };
};

module.exports = {
  cvUpload,
  imageUpload,
  handleGCSUpload
};