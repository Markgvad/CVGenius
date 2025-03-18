// controllers/cvController.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/user');
const CV = require('../models/cv');
const dataExtractionService = require('../services/cv/dataExtractionService');
const templateService = require('../services/templates/templateService');
const logger = require('../utils/logger');

// In-memory fallback storage
const inMemoryCVs = new Map();
let useInMemoryStorage = false;

/**
 * Set storage mode based on database availability
 */
exports.setStorageMode = (useMemoryStorage) => {
  useInMemoryStorage = useMemoryStorage;
  logger.info(`CV storage mode set to: ${useInMemoryStorage ? 'in-memory' : 'database'}`);
};

/**
 * Configure multer for file uploads
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use the global path set in server.js
    const uploadDir = global.uploadPaths?.base || path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
  }
};

// Configure multer for profile picture uploads
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use the global path set in server.js
    const uploadDir = global.uploadPaths?.profilePictures || path.join(__dirname, '..', 'uploads/profile-pictures');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniquePrefix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniquePrefix + path.extname(file.originalname));
  }
});

const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
  }
};

exports.upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

exports.imageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit for images
});

/**
 * Find CV by URL ID
 */
async function findCVByUrlId(urlId) {
  logger.debug('Looking for CV with urlId:', urlId);
  
  if (useInMemoryStorage) {
    const cv = inMemoryCVs.get(urlId);
    logger.debug('In-memory lookup result:', cv ? 'CV found' : 'CV not found');
    return cv;
  } else {
    try {
      const cv = await CV.findOne({ urlId });
      logger.debug('MongoDB lookup result:', cv ? 'CV found' : 'CV not found');
      if (!cv && inMemoryCVs.has(urlId)) {
        logger.debug('CV found in fallback memory storage');
        return inMemoryCVs.get(urlId);
      }
      return cv;
    } catch (error) {
      logger.error('Error finding CV in MongoDB:', error);
      // Try fallback to in-memory
      const cv = inMemoryCVs.get(urlId);
      logger.debug('Fallback in-memory lookup result:', cv ? 'CV found' : 'CV not found');
      return cv;
    }
  }
}

/**
 * Find CV by custom URL name
 */
async function findCVByCustomUrlName(customUrlName) {
  if (useInMemoryStorage) {
    // For in-memory storage, iterate through all values
    for (const cv of inMemoryCVs.values()) {
      if (cv.customUrlName === customUrlName) {
        return cv;
      }
    }
    return null;
  } else {
    return await CV.findOne({ customUrlName });
  }
}

/**
 * Save CV to storage
 */
async function saveCV(cv) {
  logger.debug('Saving CV with ID:', cv.urlId);
  
  if (useInMemoryStorage) {
    logger.debug('Using in-memory storage');
    inMemoryCVs.set(cv.urlId, cv);
    logger.debug('CV saved in memory, total CVs:', inMemoryCVs.size);
    return cv;
  } else {
    if (CV) {
      logger.debug('Using MongoDB for storage');
      try {
        const newCV = new CV(cv);
        logger.debug('CV model instance created');
        const savedCV = await newCV.save();
        logger.debug('CV saved to MongoDB, id:', savedCV._id);
        
        // Update user's cvs array if a userId is provided
        if (cv.userId && User) {
          try {
            logger.debug('Updating user record with new CV');
            await User.findByIdAndUpdate(
              cv.userId,
              { $push: { cvs: savedCV._id } }
            );
            logger.debug('User document updated with new CV reference');
          } catch (userError) {
            logger.error('Error updating user document:', userError);
          }
        }
        
        return savedCV;
      } catch (error) {
        logger.error('Error saving CV to MongoDB:', error);
        // Fallback to in-memory if MongoDB save fails
        logger.debug('Falling back to in-memory storage for this CV');
        inMemoryCVs.set(cv.urlId, cv);
        return cv;
      }
    } else {
      logger.error('CV model not initialized');
      throw new Error('CV model not initialized');
    }
  }
}

/**
 * Update CV in storage
 */
async function updateCV(cv) {
  logger.debug('Updating CV with ID:', cv.urlId);
  
  if (useInMemoryStorage) {
    logger.debug('Using in-memory storage for update');
    inMemoryCVs.set(cv.urlId, cv);
    return cv;
  } else {
    if (cv._id) {
      logger.debug('Updating existing MongoDB document with _id:', cv._id);
      try {
        await cv.save();
        logger.debug('CV updated successfully');
        return cv;
      } catch (error) {
        logger.error('Error saving CV update:', error);
        throw error;
      }
    } else {
      logger.debug('Finding CV by urlId for update');
      const existingCV = await CV.findOne({ urlId: cv.urlId });
      if (existingCV) {
        logger.debug('Found existing CV with _id:', existingCV._id);
        Object.assign(existingCV, cv);
        try {
          await existingCV.save();
          logger.debug('CV updated successfully');
          return existingCV;
        } catch (error) {
          logger.error('Error saving CV update:', error);
          throw error;
        }
      } else {
        logger.error('CV not found for update');
        throw new Error('CV not found');
      }
    }
  }
}

/**
 * Extract text from uploaded file
 */
async function extractTextFromFile(filePath, fileType) {
  logger.debug(`Extracting text from ${fileType} file...`);
  
  try {
    // Ensure the file exists before attempting to read it
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found at path: ${filePath}`);
    }
    
    // Check if file is empty
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error('File is empty and cannot be processed');
    }
    
    // Extract text based on file type
    if (fileType === 'application/pdf') {
      // Extract text from PDF
      try {
        const pdfParse = require('pdf-parse');
        const pdfBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        
        if (!pdfData.text || pdfData.text.trim().length === 0) {
          throw new Error('Could not extract text from PDF (empty or protected content)');
        }
        
        return pdfData.text;
      } catch (pdfError) {
        logger.error('PDF parsing error:', pdfError);
        throw new Error(`PDF parsing failed: ${pdfError.message}`);
      }
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               fileType === 'application/msword') {
      // Extract text from DOC/DOCX
      try {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        
        if (!result.value || result.value.trim().length === 0) {
          throw new Error('Could not extract text from document (empty or protected content)');
        }
        
        return result.value;
      } catch (docError) {
        logger.error('DOC/DOCX parsing error:', docError);
        throw new Error(`DOC/DOCX parsing failed: ${docError.message}`);
      }
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    logger.error('Error extracting text:', error);
    throw new Error(`Failed to extract text: ${error.message}`);
  }
}

/**
 * Generate custom URL name from person's name
 */
function generateCustomUrlName(name) {
  if (!name) return null;
  
  // Convert to lowercase, replace spaces with hyphens, remove special characters
  let urlName = name.toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '')             // Trim hyphens from start
    .replace(/-+$/, '');            // Trim hyphens from end
  
  // Add a random suffix to avoid collisions (4 characters)
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  urlName = `${urlName}-${randomSuffix}`;
  
  return urlName;
}

/**
 * Check if user has analytics access
 */
async function hasAnalyticsAccess(userId) {
  try {
    if (!userId || useInMemoryStorage) return false;
    
    const user = await User.findById(userId);
    if (!user) return false;
    
    logger.debug(`Checking analytics access for user ${userId}: hasAnalytics=${user.subscription?.features?.hasAnalytics}`);
    return user.subscription?.features?.hasAnalytics === true;
  } catch (error) {
    logger.error('Error checking analytics access:', error);
    return false;
  }
}

/**
 * Upload a new CV
 */
exports.uploadCV = async (req, res) => {
  try {
    logger.info('Upload request from user ID:', req.user.id);
    
    // Check user's CV quota before allowing upload
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get the user's current CV count
    let currentCVCount = 0;
    if (useInMemoryStorage) {
      currentCVCount = Array.from(inMemoryCVs.values())
        .filter(cv => cv.userId === req.user.id)
        .length;
    } else {
      currentCVCount = await CV.countDocuments({ userId: req.user.id });
    }
    
    logger.info(`User ${req.user.id} has ${currentCVCount} CVs, allowed: ${user.subscription?.features?.allowedCVs || 1}`);
    
    // Check if user has reached their quota
    const allowedCVs = user.subscription?.features?.allowedCVs || 1;
    if (currentCVCount >= allowedCVs) {
      return res.status(403).json({ 
        error: 'CV quota exceeded',
        message: `Your subscription allows a maximum of ${allowedCVs} CV(s). Please upgrade your plan or delete an existing CV.`,
        requiresUpgrade: true,
        currentCount: currentCVCount,
        maxAllowed: allowedCVs
      });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Verify the file exists on disk
    if (!fs.existsSync(req.file.path)) {
      logger.error(`Uploaded file not found at path: ${req.file.path}`);
      return res.status(500).json({ error: 'File upload failed. The file could not be saved correctly.' });
    }
    
    logger.info(`File uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
    
    // Generate a unique URL ID for the CV
    const urlId = uuidv4();
    logger.debug(`Generated URL ID: ${urlId}`);
    
    // Extract text from the uploaded file
    const filePath = req.file.path;
    const extractedText = await extractTextFromFile(filePath, req.file.mimetype);
    logger.debug(`Extracted ${extractedText.length} characters of text from file`);
    
    // Use the data extraction service
    const structuredData = await dataExtractionService.extractStructuredData(
      extractedText,
      process.env.ANTHROPIC_API_KEY,
      process.env.ANTHROPIC_MODEL
    );
    
    logger.info('Claude successfully extracted structured data');
    
    // Generate a custom URL name from the person's name
    const customUrlName = generateCustomUrlName(structuredData.personalInfo?.name);
    logger.debug(`Generated custom URL name: ${customUrlName}`);
    
    // Create CV object with structured data and custom URL
    const cv = {
      urlId,
      customUrlName,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      structuredData,
      uploadDate: new Date(),
      html: null, // We'll generate this later when user requests it
      userId: req.user.id,
      views: 0,  // Initialize analytics fields
      sectionInteractions: []
    };
    
    logger.debug('Created CV object with userId:', cv.userId);
    
    // Save CV to storage
    const savedCV = await saveCV(cv);
    logger.info(`CV saved with success:`, !!savedCV);
    
    // Return success with redirect URL and custom URL
    res.json({
      success: true,
      message: 'CV uploaded and data extracted successfully',
      urlId,
      customUrlName,
      redirectUrl: `/cv-editor.html?id=${urlId}`,
      customUrl: `/${customUrlName}`
    });
    
  } catch (error) {
    logger.error('Error uploading CV:', error);
    res.status(500).json({ error: 'Error uploading CV: ' + error.message });
  }
};

/**
 * Get CV data for editing
 */
exports.getCVData = async (req, res) => {
  try {
    const urlId = req.params.urlId;
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }
    
    res.json(cv.structuredData);
  } catch (error) {
    logger.error('Error fetching CV data:', error);
    res.status(500).json({ error: 'Error fetching CV data' });
  }
};

/**
 * Save edited CV data
 */
exports.updateCVData = async (req, res) => {
  try {
    const urlId = req.params.urlId;
    const updatedData = req.body;
    
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }
    
    // Update structured data only
    cv.structuredData = updatedData;
    await updateCV(cv);
    
    res.json({ success: true, message: 'CV data saved successfully' });
  } catch (error) {
    logger.error('Error saving CV data:', error);
    res.status(500).json({ error: 'Error saving CV data' });
  }
};

/**
 * Generate HTML from structured data
 */
exports.generateHTML = async (req, res) => {
  try {
    const urlId = req.params.urlId;
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }
    
    logger.info(`Generating HTML for CV: ${urlId}`);
    
    // Generate HTML using template service
    const html = await templateService.generateCvHtml(
      cv, 
      process.env.ANTHROPIC_API_KEY,
      process.env.ANTHROPIC_MODEL
    );
    
    // Update CV with generated HTML
    cv.html = html;
    await updateCV(cv);
    logger.info(`Generated HTML CV (${html.length} bytes)`);
    
    // Return success with redirect URL and custom URL
    res.json({
      success: true,
      message: 'HTML generated successfully',
      viewUrl: `/view-cv/${urlId}`,
      customUrl: cv.customUrlName ? `/${cv.customUrlName}` : null
    });
  } catch (error) {
    logger.error('Error generating HTML:', error);
    res.status(500).json({ error: 'Error generating HTML: ' + error.message });
  }
};

/**
 * View generated CV
 */
exports.viewCV = async (req, res) => {
  try {
    const urlId = req.params.urlId;
    const cv = await findCVByUrlId(urlId);
    
    if (!cv || !cv.html) {
      return res.status(404).send('CV not found or HTML not yet generated');
    }
    
    // Increment view counter directly here as well
    cv.views = (cv.views || 0) + 1;
    cv.lastViewed = new Date();
    await updateCV(cv);
    
    res.send(cv.html);
  } catch (error) {
    logger.error('Error viewing CV:', error);
    res.status(500).send('Error viewing CV. Please try again.');
  }
};

/**
 * Get CV metadata
 */
exports.getCVMetadata = async (req, res) => {
  try {
    const urlId = req.params.urlId;
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }
    
    // Return only metadata (not the full structuredData or HTML)
    res.json({
      urlId: cv.urlId,
      customUrlName: cv.customUrlName,
      hasHtml: !!cv.html,
      fileName: cv.fileName,
      uploadDate: cv.uploadDate
    });
  } catch (error) {
    logger.error('Error fetching CV metadata:', error);
    res.status(500).json({ error: 'Error fetching CV metadata' });
  }
};

/**
 * Delete CV
 */
exports.deleteCV = async (req, res) => {
  try {
    const urlId = req.params.urlId;
    logger.info(`Delete request for CV with urlId: ${urlId} from user: ${req.user.id}`);
    
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }
    
    // Verify the user owns this CV
    if (cv.userId && cv.userId.toString() !== req.user.id) {
      logger.warn('Unauthorized delete attempt: CV belongs to', cv.userId, 'but request from', req.user.id);
      return res.status(403).json({ error: 'You do not have permission to delete this CV' });
    }
    
    // Remove the CV reference from the user's cvs array
    if (!useInMemoryStorage && User) {
      logger.debug('Removing CV reference from user document');
      await User.findByIdAndUpdate(
        req.user.id,
        { $pull: { cvs: cv._id } }
      );
    }
    
    // Delete the CV
    if (useInMemoryStorage) {
      logger.debug('Deleting CV from in-memory storage');
      inMemoryCVs.delete(urlId);
    } else {
      logger.debug('Deleting CV from MongoDB');
      await CV.deleteOne({ urlId: urlId });
    }
    
    logger.info(`CV ${urlId} successfully deleted`);
    return res.status(200).json({ success: true, message: 'CV deleted successfully' });
  } catch (error) {
    logger.error('Error deleting CV:', error);
    return res.status(500).json({ error: 'Error deleting CV' });
  }
};

/**
 * Generate PDF from HTML
 */
exports.generatePDF = async (req, res) => {
  try {
    const urlId = req.params.urlId;
    const cv = await findCVByUrlId(urlId);
    
    if (!cv || !cv.html) {
      return res.status(404).send('CV not found or HTML not yet generated');
    }
    
    // Launch puppeteer
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // For some environments like Docker
    });
    const page = await browser.newPage();
    
    // Create a temporary HTML with the CV
    const tempHtml = cv.html.replace('</head>', `
      <style>
        @media print {
          body { background-color: white !important; }
          .page { margin: 0 !important; max-width: 100% !important; }
          
          /* Ensure all expandable sections are visible */
          .achievement-content {
            max-height: none !important;
            padding: 0 16px 16px !important;
            display: block !important;
          }
          
          .achievement-toggle { display: none !important; }
          
          /* Ensure all elements appear */
          .achievement-item {
            opacity: 1 !important;
            transform: none !important;
          }
          
          .metric-card {
            opacity: 1 !important;
            transform: none !important;
          }
          
          .progress-fill {
            width: var(--data-width) !important;
          }
          
          .cv-template-footer { display: none !important; }
        }
      </style>
    </head>`);
    
    // Set content and wait for it to load
    await page.setContent(tempHtml, { waitUntil: 'networkidle0' });
    
    // Activate all expandable sections
    await page.evaluate(() => {
      document.querySelectorAll('.achievement-item').forEach(item => {
        item.classList.add('active');
      });
    });
    
    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
    });
    
    await browser.close();
    
    // Set headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${cv.fileName || 'cv'}.pdf"`);
    
    // Send the PDF
    res.send(pdf);
  } catch (error) {
    logger.error('Error generating PDF:', error);
    res.status(500).send('Error generating PDF');
  }
};

/**
 * Handle custom URL request
 */
exports.handleCustomUrl = async (req, res, next) => {
  try {
    const customUrlName = req.params.customUrlName;
    
    // Skip for known routes and static files
    if (['api', 'uploads', 'view-cv', 'cv-editor.html', 'index.html', 'login.html', 'register.html', 'dashboard', 'success', 'pricing'].includes(customUrlName) ||
        customUrlName.includes('.')) {
      return next();
    }
    
    logger.debug(`Custom URL request for: ${customUrlName}`);
    
    // Look up CV by custom URL name
    const cv = await findCVByCustomUrlName(customUrlName);
    
    if (!cv) {
      logger.debug(`No CV found for custom URL: ${customUrlName}`);
      return res.status(404).send('CV not found');
    }
    
    // Check if HTML is generated
    if (!cv.html) {
      logger.debug(`HTML not yet generated for CV: ${cv.urlId}`);
      // Redirect to editor if HTML not generated
      return res.redirect(`/cv-editor.html?id=${cv.urlId}`);
    }
    
    // Increment view counter
    cv.views = (cv.views || 0) + 1;
    cv.lastViewed = new Date(); 
    await updateCV(cv);
    
    // Send the HTML CV
    logger.info(`Serving CV with custom URL: ${customUrlName}`);
    res.send(cv.html);
  } catch (error) {
    logger.error('Error accessing custom URL CV:', error);
    res.status(500).send('Error accessing CV. Please try again.');
  }
};

/**
 * Get user's CVs 
 */
exports.getUserCVs = async (req, res) => {
  try {
    logger.debug('Fetching CVs for user ID:', req.user.id);
    
    if (useInMemoryStorage) {
      logger.debug('Using in-memory storage for CV lookup');
      const userCvs = Array.from(inMemoryCVs.values())
        .filter(cv => cv.userId === req.user.id);
      
      logger.debug(`Found ${userCvs.length} CVs in memory for user`);
      
      const transformedCvs = userCvs.map(({ urlId, customUrlName, fileName, uploadDate, html }) => ({ 
        urlId, customUrlName, fileName, uploadDate, hasHtml: !!html 
      }));
      
      res.json(transformedCvs);
    } else {
      logger.debug('Using MongoDB for CV lookup');
      const cvs = await CV.find({ userId: req.user.id })
        .select('urlId customUrlName fileName uploadDate html')
        .sort({ uploadDate: -1 });
      
      logger.debug(`Found ${cvs.length} CVs in MongoDB for user`);
      
      // Transform to include hasHtml property instead of the full HTML
      const transformedCvs = cvs.map(cv => ({
        urlId: cv.urlId,
        customUrlName: cv.customUrlName,
        fileName: cv.fileName,
        uploadDate: cv.uploadDate,
        hasHtml: !!cv.html
      }));
      
      res.json(transformedCvs);
    }
  } catch (error) {
    logger.error('Error fetching user CVs:', error);
    res.status(500).json({ error: 'Error fetching user CVs' });
  }
};

/**
 * Get count of user's CVs
 */
exports.getUserCVCount = async (req, res) => {
  try {
    let count = 0;
    
    if (useInMemoryStorage) {
      count = Array.from(inMemoryCVs.values())
        .filter(cv => cv.userId === req.user.id)
        .length;
    } else {
      count = await CV.countDocuments({ userId: req.user.id });
    }
    
    res.json({ count });
  } catch (error) {
    logger.error('Error counting CVs:', error);
    res.status(500).json({ error: 'Error counting CVs' });
  }
};

// Export internal functions for use in other controllers
/**
 * Upload a profile picture
 */
exports.uploadProfilePicture = async (req, res) => {
  try {
    logger.info('Profile picture upload request');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    // Read the file as base64 data
    const fileBuffer = fs.readFileSync(req.file.path);
    const base64Image = fileBuffer.toString('base64');
    
    // Create a data URL from the base64 data
    const mimeType = req.file.mimetype;
    const dataUrl = `data:${mimeType};base64,${base64Image}`;
    
    // We no longer need the file on disk
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      logger.warn(`Could not delete temporary file: ${err.message}`);
    }
    
    logger.info(`Profile picture uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
    logger.debug(`Image converted to data URL (length: ${dataUrl.length})`);
    
    // Return the data URL
    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      imageUrl: dataUrl,
      fileName: req.file.originalname
    });
  } catch (error) {
    logger.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Error uploading profile picture: ' + error.message });
  }
};

exports._internal = {
  findCVByUrlId,
  findCVByCustomUrlName,
  saveCV,
  updateCV,
  hasAnalyticsAccess
};