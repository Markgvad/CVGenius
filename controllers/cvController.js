// controllers/cvController.js
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/user');
const CV = require('../models/cv');
const dataExtractionService = require('../services/cv/dataExtractionService');
const templateService = require('../services/templates/templateService');
const logger = require('../utils/logger');
const gcsService = require('../services/storage/gcsService');
const { cvUpload, imageUpload, handleGCSUpload } = require('../middleware/gcsUpload');

// Define temp directory - handle both development and production paths
const rootDir = process.env.NODE_ENV === 'production' ? 
  '/opt/render/project/src' :  // Production path on Render
  path.resolve(path.join(__dirname, '..')); // Development path
const tempDir = path.join(rootDir, 'temp-uploads');

// In-memory fallback storage
const inMemoryCVs = new Map();
let useInMemoryStorage = false;

// Check if Google Cloud Storage is enabled
const useGCS = process.env.USE_GCS === 'true';

/**
 * Set storage mode based on database availability
 */
exports.setStorageMode = (useMemoryStorage) => {
  useInMemoryStorage = useMemoryStorage;
  logger.info(`CV storage mode set to: ${useInMemoryStorage ? 'in-memory' : 'database'}`);
};

// Export middleware for routes
exports.upload = cvUpload;
exports.imageUpload = imageUpload;

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
    // Check if the file exists at the original path
    if (!fs.existsSync(filePath)) {
      logger.warn(`File not found at original path: ${filePath}`);
      
      try {
        // Additional diagnostics
        logger.info('Listing temp directory contents:');
        const tempDir = path.dirname(filePath);
        
        // Check if the directory exists
        if (fs.existsSync(tempDir)) {
          const files = fs.readdirSync(tempDir);
          logger.info(`Temp directory ${tempDir} contains ${files.length} files`);
          files.forEach(file => logger.info(`- ${file}`));
        } else {
          logger.warn(`Temp directory ${tempDir} does not exist!`);
        }
        
        // If we can't find the file now, it's truly missing
        throw new Error(`File not found at path: ${filePath} and directory ${tempDir} ${fs.existsSync(tempDir) ? 'exists but does not contain the file' : 'does not exist'}`);
      } catch (error) {
        if (error.message.includes('File not found')) {
          throw error; // Re-throw our specific error
        }
        logger.error('Error while diagnosing missing file:', error);
        throw new Error(`File not found at path: ${filePath} and diagnostics failed: ${error.message}`);
      }
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
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    // Return a completely random URL if no name is provided
    return `cv-${Math.random().toString(36).substring(2, 10)}`;
  }
  
  try {
    // Convert to lowercase, replace spaces with hyphens, remove special characters
    let urlName = name.toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with hyphens
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple hyphens with single hyphen
      .replace(/^-+/, '')             // Trim hyphens from start
      .replace(/-+$/, '');            // Trim hyphens from end
    
    // If after processing the name becomes empty, use fallback
    if (!urlName || urlName.length < 2) {
      urlName = 'cv';
    }
    
    // Add a random suffix to avoid collisions (6 characters for more uniqueness)
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    urlName = `${urlName}-${randomSuffix}`;
    
    return urlName;
  } catch (error) {
    logger.error('Error generating custom URL name:', error);
    return `cv-${Math.random().toString(36).substring(2, 10)}`;
  }
}

/**
 * Check if user has analytics access
 */
async function hasAnalyticsAccess(userId) {
  try {
    if (!userId || useInMemoryStorage) return false;
    
    const user = await User.findById(userId);
    if (!user) return false;
    
    logger.debug(`Checking analytics access for user ${userId}: hasAnalytics=${user.hasAnalytics}`);
    return user.hasAnalytics === true;
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
    
    logger.info(`User ${req.user.id} has ${currentCVCount} CVs, allowed: ${user.allowedCVs || 1}`);
    
    // Check if user has reached their quota
    const allowedCVs = user.allowedCVs || 1;
    // Skip quota check for "Infinity" value (unlimited CVs for premium plans)
    if (allowedCVs !== Infinity && currentCVCount >= allowedCVs) {
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
    
    // Check if either the local file exists or we have a successful GCS upload
    const hasLocalFile = fs.existsSync(req.file.path);
    const hasGcsUpload = req.file.publicUrl && req.file.gcs;
    
    if (!hasLocalFile && !hasGcsUpload) {
      logger.error(`Uploaded file not found at path: ${req.file.path} and no GCS upload available`);
      return res.status(500).json({ error: 'File upload failed. The file could not be saved correctly.' });
    }
    
    if (!hasLocalFile) {
      logger.warn(`Local file not found at ${req.file.path}, but GCS upload is available: ${req.file.publicUrl}`);
    }
    
    logger.info(`File uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
    
    // Extract text from the uploaded file 
    let extractedText;
    
    if (hasLocalFile) {
      // If local file exists, extract directly
      const filePath = req.file.path;
      logger.info(`Attempting to extract text from local file at path: ${filePath}`);
      logger.info(`File exists check: ${fs.existsSync(filePath)}`);
      logger.info(`Working directory: ${process.cwd()}`);
      
      extractedText = await extractTextFromFile(filePath, req.file.mimetype);
    } else if (hasGcsUpload) {
      // If no local file but we have GCS upload, download to temp and extract
      try {
        logger.info(`Local file missing. Downloading from GCS URL for processing: ${req.file.publicUrl}`);
        
        // Download to a new temporary file
        const axios = require('axios');
        const tempFilePath = path.join(tempDir, `gcs-download-${Date.now()}-${path.basename(req.file.path)}`);
        
        const response = await axios({
          method: 'get',
          url: req.file.publicUrl,
          responseType: 'stream'
        });
        
        // Create write stream and save file
        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        
        logger.info(`Downloaded GCS file to temp location: ${tempFilePath}`);
        
        // Now extract text from the downloaded file
        extractedText = await extractTextFromFile(tempFilePath, req.file.mimetype);
        
        // Clean up the temporary download
        fs.unlink(tempFilePath, (err) => {
          if (err) logger.warn(`Failed to delete temporary GCS download: ${tempFilePath}`, err);
          else logger.debug(`Deleted temporary GCS download: ${tempFilePath}`);
        });
      } catch (downloadError) {
        logger.error('Error downloading from GCS for text extraction:', downloadError);
        throw new Error('Failed to process file: ' + downloadError.message);
      }
    } else {
      throw new Error('Neither local file nor GCS upload is available for processing');
    }
    logger.debug(`Successfully extracted ${extractedText.length} characters of text from file`);
    
    // Now we can upload to GCS after text extraction is done
    if (useGCS && !req.file.publicUrl) {
      try {
        logger.info('Uploading CV file to Google Cloud Storage');
        // We can safely delete the local file now that we've extracted the text
        const uploadResult = await gcsService.uploadFile(req.file, 'cvs', false);
        req.file.gcs = uploadResult;
        
        // Use signed URL if available, otherwise fall back to public URL
        req.file.publicUrl = uploadResult.signedUrl || uploadResult.publicUrl;
        logger.info(`CV file uploaded to GCS: ${req.file.publicUrl}`);
      } catch (gcsError) {
        logger.error('Failed to upload to GCS, will use local file:', gcsError);
      }
    }
    
    // Generate a unique URL ID for the CV
    const urlId = uuidv4();
    logger.debug(`Generated URL ID: ${urlId}`);
    
    // Use the data extraction service
    const structuredData = await dataExtractionService.extractStructuredData(
      extractedText,
      process.env.ANTHROPIC_API_KEY,
      process.env.ANTHROPIC_MODEL
    );
    
    // Log the detected language
    const detectedLanguage = structuredData.language || 'unknown';
    logger.info(`Claude successfully extracted structured data. Detected language: ${detectedLanguage}`);
    
    // Make sure language is preserved
    if (!structuredData.language) {
      structuredData.language = 'english'; // Default fallback
      logger.warn('No language detected, defaulting to English');
    }
    
    // Verify the structure of the data and repair if needed
    if (!structuredData.personalInfo || typeof structuredData.personalInfo !== 'object') {
      logger.warn('No personalInfo object found in extracted data, creating it');
      structuredData.personalInfo = {};
    }
    
    // Make sure personalInfo has all required fields
    ['name', 'title', 'email', 'phone', 'linkedin', 'location'].forEach(field => {
      if (!structuredData.personalInfo[field]) {
        logger.warn(`Missing ${field} in personalInfo, initializing to empty string`);
        structuredData.personalInfo[field] = '';
      }
    });
    
    // Ensure profile is present and not empty
    if (typeof structuredData.profile !== 'string' || structuredData.profile.trim() === '') {
      logger.warn('Profile is empty or not a string, will try to generate one in data extraction');
      
      // If we can't get a profile now, at least initialize to empty string
      if (!structuredData.profile) {
        structuredData.profile = '';
      }
      
      // We'll rely on the improved extraction prompt to generate a profile
    }
    
    // Ensure all array sections exist
    ['metrics', 'experience', 'skills', 'education', 'languages'].forEach(section => {
      if (!Array.isArray(structuredData[section])) {
        logger.warn(`${section} is not an array, initializing to empty array`);
        structuredData[section] = [];
      }
    });
    
    // Make sure we have at least 4 metrics
    if (!structuredData.metrics || structuredData.metrics.length < 4) {
      logger.warn(`CV has fewer than 4 metrics (${structuredData.metrics?.length || 0}), metrics extraction may have failed`);
      
      // We'll rely on our updated extraction prompt to generate these
      // Future improvement: Create fallback metrics here if needed
    }
    
    // Generate a custom URL name from the person's name or use a fallback
    let customUrlName = null;
    
    if (structuredData.personalInfo?.name && structuredData.personalInfo.name.trim()) {
      customUrlName = generateCustomUrlName(structuredData.personalInfo.name);
      logger.debug(`Generated custom URL name from name: ${customUrlName}`);
    } else {
      // Generate a random URL name as fallback to prevent null duplicates
      customUrlName = `cv-${Math.random().toString(36).substring(2, 10)}`;
      logger.debug(`Generated random URL name as fallback: ${customUrlName}`);
    }
    
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
      sectionInteractions: [],
      // Add GCS information if available
      fileUrl: req.file.publicUrl || null,
      gcsPath: req.file.gcs?.path || null
    };
    
    logger.debug('Created CV object with userId:', cv.userId);
    
    // Save CV to storage
    const savedCV = await saveCV(cv);
    logger.info(`CV saved with success:`, !!savedCV);
    
    // Clean up local file after processing if using GCS
    if (useGCS && req.file.publicUrl && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          logger.warn(`Failed to delete local CV file: ${req.file.path}`, err);
        } else {
          logger.debug(`Deleted local CV file: ${req.file.path}`);
        }
      });
    }
    
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
    
    // Add detailed logging of the CV data structure
    logger.info('CV found, examining data structure...');
    
    if (!cv.structuredData) {
      logger.error('CV has no structuredData property!');
      return res.status(500).json({ error: 'CV data is corrupted - no structured data' });
    }
    
    // Dump the first level keys of the structured data
    const keys = Object.keys(cv.structuredData);
    logger.info(`CV structuredData keys: ${keys.join(', ')}`);
    
    // Check the personalInfo specifically
    if (cv.structuredData.personalInfo) {
      const personalInfoKeys = Object.keys(cv.structuredData.personalInfo);
      logger.info(`CV personalInfo keys: ${personalInfoKeys.join(', ')}`);
      logger.info(`CV personalInfo name: "${cv.structuredData.personalInfo.name || 'MISSING'}"`);
    } else {
      logger.error('CV has no personalInfo property!');
    }
    
    // Check the profile 
    logger.info(`CV profile present: ${!!cv.structuredData.profile}`);
    if (cv.structuredData.profile) {
      logger.info(`CV profile sample: "${cv.structuredData.profile.substring(0, 50)}..."`);
    }
    
    // Create a clone of the data to avoid reference issues
    let processedData = JSON.parse(JSON.stringify(cv.structuredData));
    
    // Make sure we have all required sections, even if they are empty
    processedData.personalInfo = processedData.personalInfo || {};
    processedData.profile = processedData.profile || '';
    processedData.metrics = processedData.metrics || [];
    processedData.experience = processedData.experience || [];
    processedData.skills = processedData.skills || [];
    processedData.education = processedData.education || [];
    processedData.languages = processedData.languages || [];
    
    // Log the processed data structure
    logger.info(`Processed data has personalInfo: ${!!processedData.personalInfo}`);
    logger.info(`Processed data has profile: ${!!processedData.profile}`);
    
    // Return the processed data
    res.json(processedData);
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
    
    // Log the structure of the data being received
    logger.info(`CV update request data structure keys: ${Object.keys(updatedData).join(', ')}`);
    logger.info(`Has personalInfo: ${!!updatedData.personalInfo}`);
    
    // Validate structure of updated data
    const validStructure = 
      updatedData && 
      typeof updatedData === 'object' && 
      updatedData.personalInfo && 
      typeof updatedData.personalInfo === 'object';
    
    if (!validStructure) {
      logger.error('Invalid data structure in CV update request');
      logger.error(`Data received: ${JSON.stringify(updatedData, null, 2)}`);
      
      return res.status(400).json({ 
        error: 'Invalid data structure',
        message: 'The CV data must contain a personalInfo object'
      });
    }
    
    // Preserve the language field if it exists in the original data but not in the update
    if (cv.structuredData?.language && !updatedData.language) {
      updatedData.language = cv.structuredData.language;
      logger.info(`Preserved language field: ${updatedData.language}`);
    }
    
    // Ensure the personalInfo object has all required fields
    updatedData.personalInfo = updatedData.personalInfo || {};
    ['name', 'title', 'email', 'phone', 'linkedin', 'location'].forEach(field => {
      updatedData.personalInfo[field] = updatedData.personalInfo[field] || '';
    });
    
    // Ensure the profile is a string
    if (typeof updatedData.profile !== 'string') {
      updatedData.profile = updatedData.profile ? String(updatedData.profile) : '';
    }
    
    // Ensure other sections are arrays
    ['metrics', 'experience', 'skills', 'education', 'languages'].forEach(section => {
      updatedData[section] = Array.isArray(updatedData[section]) ? updatedData[section] : [];
    });
    
    // Update structured data
    cv.structuredData = updatedData;
    
    // Log the profile picture URL after update for debugging
    logger.info(`After CV update - Profile picture URL: "${cv.structuredData?.personalInfo?.profilePicture || 'None'}"`);
    
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
    
    // Check if profile picture URL looks valid before proceeding
    const profilePictureUrl = cv.structuredData?.personalInfo?.profilePicture;
    if (profilePictureUrl && profilePictureUrl.startsWith('data:')) {
      logger.warn(`CV ${urlId} has unsaved profile picture data URL. This should have been uploaded already.`);
      return res.status(400).json({ 
        error: 'Profile picture not properly saved',
        message: 'Please save the CV again before generating HTML.'
      });
    }
    
    logger.info(`Generating HTML for CV: ${urlId}`);
    
    // Log the profile picture URL for debugging before generating HTML
    logger.info(`Before HTML generation - Profile picture URL: "${cv.structuredData?.personalInfo?.profilePicture || 'None'}"`);
    
    // Log the entire CV structure to debug the issue
    logger.info(`CV structure: ${JSON.stringify({
      urlId: cv.urlId,
      hasPersonalInfo: !!cv.structuredData?.personalInfo,
      profilePicUrl: cv.structuredData?.personalInfo?.profilePicture
    }, null, 2)}`);
    
    // Generate HTML using template service
    const html = await templateService.generateCvHtml(
      cv, 
      process.env.ANTHROPIC_API_KEY,
      process.env.ANTHROPIC_MODEL
    );
    
    // Generate placeholder PDF page
    const placeholderHtml = await generatePlaceholderPage(cv);
    logger.info(`Generated placeholder page with length: ${placeholderHtml?.length || 0} bytes`);
    
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
 * View the placeholder page that links to the interactive CV
 */
exports.viewPlaceholderPage = async (req, res) => {
  try {
    const urlId = req.params.urlId;
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).send('CV not found');
    }
    
    // If the placeholder page hasn't been generated yet, generate it now
    if (!cv.placeholderPage) {
      logger.info(`No placeholder page found for CV ${urlId}, generating now`);
      const placeholderHtml = await generatePlaceholderPage(cv);
      if (placeholderHtml) {
        await updateCV(cv);
        logger.info(`Generated and saved placeholder page (${placeholderHtml.length} bytes)`);
      }
    }
    
    if (!cv.placeholderPage) {
      logger.error(`Failed to generate placeholder page for CV ${urlId}`);
      // Create a basic placeholder if we couldn't generate one
      const name = cv.structuredData?.personalInfo?.name || 'CV Owner';
      const viewUrl = cv.customUrlName ? `/${cv.customUrlName}` : `/view-cv/${cv.urlId}`;
      const basicPlaceholder = `<!DOCTYPE html>
<html>
<head>
  <title>${name} - CV</title>
  <meta http-equiv="refresh" content="0;URL='${viewUrl}'" />
</head>
<body>
  <p>Redirecting to interactive CV...</p>
  <p>If you are not redirected, <a href="${viewUrl}">click here</a></p>
</body>
</html>`;
      
      res.send(basicPlaceholder);
      return;
    }
    
    res.send(cv.placeholderPage);
  } catch (error) {
    logger.error('Error viewing placeholder page:', error);
    res.status(500).send('Error viewing placeholder page. Please try again.');
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
      hasPlaceholder: !!cv.placeholderPage,
      fileName: cv.fileName,
      uploadDate: cv.uploadDate,
      placeholderUrl: cv.placeholderPage ? `/api/cv/placeholder/${cv.urlId}` : null
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
    
    // Delete file from Google Cloud Storage if applicable
    if (useGCS && cv.gcsPath) {
      try {
        logger.debug(`Deleting CV file from GCS: ${cv.gcsPath}`);
        await gcsService.deleteFile(cv.gcsPath);
        logger.info(`CV file deleted from GCS: ${cv.gcsPath}`);
      } catch (gcsError) {
        // Log error but continue with CV deletion
        logger.error(`Failed to delete CV file from GCS: ${cv.gcsPath}`, gcsError);
      }
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
          
          /* Preserve text formatting */
          .achievement-content p {
            white-space: pre-wrap !important;
          }
          
          .achievement-content ul {
            margin-left: 20px !important;
            list-style-type: disc !important;
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
      // Make all achievement items active
      document.querySelectorAll('.achievement-item').forEach(item => {
        item.classList.add('active');
      });
      
      // Expand all job cards to show achievements
      document.querySelectorAll('.experience-card').forEach(card => {
        card.classList.add('job-expanded');
        
        // Update buttons if they exist
        const button = card.querySelector('.show-achievements-btn');
        if (button) {
          button.innerHTML = '<i class="fas fa-chevron-up"></i> Hide Achievements';
        }
      });
      
      // Expand all skill categories
      document.querySelectorAll('.skill-category').forEach(category => {
        category.classList.add('active');
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
 * This uses a debounce mechanism to prevent multiple uploads of the same picture
 */
// Keep track of in-progress uploads to avoid duplicates
const profilePictureUploads = new Map();

exports.uploadProfilePicture = async (req, res) => {
  try {
    logger.info('Profile picture upload request');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    // Create a unique key for this upload to avoid duplicates
    let uploadKey = `${req.file.originalname}-${req.file.size}-${req.file.mimetype}`;
    
    // Add a more robust deduplication check for GCS uploads
    if (req.file.gcs && req.file.originalGcsFilename) {
      // Use the GCS filename as part of the deduplication key
      logger.info(`Using GCS filename for deduplication: ${req.file.originalGcsFilename}`);
      uploadKey = `gcs-${req.file.originalGcsFilename}`;
    }
    
    // Check if this file is already being uploaded
    if (profilePictureUploads.has(uploadKey)) {
      logger.info(`Profile picture already being uploaded, returning existing promise for: ${req.file.originalname}`);
      
      try {
        // Wait for the existing upload to complete
        const result = await profilePictureUploads.get(uploadKey);
        return res.json(result);
      } catch (error) {
        // If the existing upload failed, continue with a new upload
        logger.warn(`Previous upload attempt failed, trying again: ${error.message}`);
        profilePictureUploads.delete(uploadKey);
      }
    }
    
    // Create a new promise for this upload
    const uploadPromise = (async () => {
      try {
        // Handle file upload to GCS if enabled
        let imageUrl;
        
        // Only use the URL provided by middleware - don't try to upload again
        // This prevents duplicate uploads of the same image
        if (req.file.gcs && (req.file.gcs.signedUrl || req.file.gcs.publicUrl)) {
          logger.info('File already uploaded to GCS by middleware');
          imageUrl = req.file.gcs.signedUrl || req.file.gcs.publicUrl;
          logger.info(`Using existing GCS URL: ${imageUrl}`);
        }
        // If the middleware didn't handle the upload but we have a publicUrl directly on req.file
        else if (req.file.publicUrl) {
          logger.info('Using publicUrl directly from req.file');
          imageUrl = req.file.publicUrl;
        }
        // As a last resort, if GCS is enabled but middleware didn't handle it, log the issue
        else if (useGCS) {
          logger.warn('GCS upload not handled by middleware as expected');
          logger.info(`Available req.file properties: ${Object.keys(req.file).join(', ')}`);
          
          // We don't attempt a second upload here - this avoids duplicates
          // The middleware should have handled it, so this is just for debugging
        } 
        // If GCS is not enabled, use local file storage
        else {
          // Fall back to local URL if GCS is not enabled
          const localImageUrl = req.file.path.replace(/\\/g, '/');
          const hostUrl = `${req.protocol}://${req.get('host')}`;
          imageUrl = `${hostUrl}/${localImageUrl}`;
          logger.info(`Using local file URL: ${imageUrl}`);
        }
        
        // If we still don't have a URL, check if the file has a publicUrl from middleware
        if (!imageUrl && req.file.publicUrl) {
          logger.info('Using publicUrl from middleware');
          imageUrl = req.file.publicUrl;
        }
        
        // If we still don't have a URL, check if req.file has any useful information
        if (!imageUrl) {
          logger.error('Failed to generate image URL for profile picture');
          logger.info(`Available req.file properties: ${Object.keys(req.file).join(', ')}`);
          
          // Last resort - try to use any URL information we can find
          if (req.file.location) { // For AWS S3
            imageUrl = req.file.location;
          } else if (req.file.url) { // Generic URL property
            imageUrl = req.file.url;
          } else if (req.file.gcs) {
            // Try any property in the gcs object
            imageUrl = req.file.gcs.publicUrl || req.file.gcs.signedUrl || req.file.gcs.url;
          }
          
          if (imageUrl) {
            logger.info(`Found alternative URL: ${imageUrl}`);
          } else {
            logger.error('No image URL could be determined');
          }
        }
        
        // Fallback: For debugging/temporary use, send a mock URL if needed in production
        if (!imageUrl && process.env.NODE_ENV === 'production') {
          imageUrl = `https://storage.googleapis.com/cvgenius-picture/profile-pictures/fallback-profile.jpg`;
          logger.warn(`Using fallback image URL for development/debugging: ${imageUrl}`);
        }
        
        logger.info(`Profile picture uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
        logger.info(`Profile picture URL being returned to client: "${imageUrl}"`);
        
        const result = {
          success: true,
          message: 'Profile picture uploaded successfully',
          imageUrl: imageUrl,
          fileName: req.file.filename || req.file.gcs?.filename || path.basename(imageUrl || '')
        };
        
        logger.info(`Complete profile picture response: ${JSON.stringify(result, null, 2)}`);
        
        return result;
      } finally {
        // Remove from the map once done
        setTimeout(() => {
          profilePictureUploads.delete(uploadKey);
        }, 1000);
      }
    })();
    
    // Store the promise in the map
    profilePictureUploads.set(uploadKey, uploadPromise);
    
    // Wait for upload to complete and send response
    const result = await uploadPromise;
    res.json(result);
    
  } catch (error) {
    logger.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Error uploading profile picture: ' + error.message });
  }
};

/**
 * Fix CV data structure
 * This is an admin-only API endpoint to repair corrupted CV data
 */
exports.repairCVStructure = async (req, res) => {
  try {
    const urlId = req.params.urlId;
    
    // Only allow access to admins
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }
    
    // Check if CV has structured data
    if (!cv.structuredData) {
      return res.status(400).json({ error: 'CV has no structured data to repair' });
    }
    
    logger.info(`Repairing CV structure for CV ${urlId}`);
    logger.info(`Original structure: ${JSON.stringify(Object.keys(cv.structuredData))}`);
    
    // Create a new structured data object with correct structure
    const repairedData = {
      language: cv.structuredData.language || 'english',
      personalInfo: {
        name: '',
        title: '',
        email: '',
        phone: '',
        linkedin: '',
        location: '',
        profilePicture: null
      },
      profile: '',
      metrics: [],
      experience: [],
      skills: [],
      education: [],
      languages: []
    };
    
    // Copy over values from old structure to new structure
    // For personalInfo, check both nested and direct properties
    if (cv.structuredData.personalInfo && typeof cv.structuredData.personalInfo === 'object') {
      // PersonalInfo is correctly nested
      Object.assign(repairedData.personalInfo, cv.structuredData.personalInfo);
    } else {
      // Check for direct personalInfo fields at the top level
      ['name', 'title', 'email', 'phone', 'linkedin', 'location', 'profilePicture'].forEach(field => {
        if (cv.structuredData[field] !== undefined) {
          repairedData.personalInfo[field] = cv.structuredData[field];
          logger.info(`Moved ${field} from top level to personalInfo`);
        }
      });
    }
    
    // Handle profile section
    if (cv.structuredData.profile !== undefined) {
      repairedData.profile = cv.structuredData.profile;
    }
    
    // Handle arrays - metrics, experience, skills, education, languages
    ['metrics', 'experience', 'skills', 'education', 'languages'].forEach(section => {
      if (Array.isArray(cv.structuredData[section])) {
        repairedData[section] = cv.structuredData[section];
      }
    });
    
    // Update the CV with repaired structure
    cv.structuredData = repairedData;
    await updateCV(cv);
    
    logger.info(`CV ${urlId} structure repaired successfully`);
    return res.json({
      success: true,
      message: 'CV structure repaired successfully'
    });
    
  } catch (error) {
    logger.error('Error repairing CV structure:', error);
    res.status(500).json({ error: 'Error repairing CV structure' });
  }
};

/**
 * Reprocess CV data to detect language
 * This is an admin-only API endpoint
 */
exports.reprocessCVLanguage = async (req, res) => {
  try {
    const urlId = req.params.urlId;
    
    // Only allow access to admins
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const cv = await findCVByUrlId(urlId);
    
    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }
    
    // Check if CV already has a language field
    if (cv.structuredData && cv.structuredData.language) {
      return res.json({ 
        message: 'CV already has language detected', 
        language: cv.structuredData.language 
      });
    }
    
    // Need original text to detect language, which we don't store
    // We'll try to infer it from existing data
    let inferredLanguage = 'english'; // Default
    
    // Check for language indicators in the CV
    if (cv.structuredData) {
      const profileText = cv.structuredData.profile || '';
      
      // Check for Danish indicators
      if (/arbejde|uddannelse|erfaring|kompetencer|færdigheder/i.test(profileText)) {
        inferredLanguage = 'danish';
      }
      // Check for Spanish indicators
      else if (/trabajo|educación|experiencia|habilidades|competencias/i.test(profileText)) {
        inferredLanguage = 'spanish';
      }
      // Check for French indicators
      else if (/travail|éducation|expérience|compétences/i.test(profileText)) {
        inferredLanguage = 'french';
      }
      // Check for German indicators
      else if (/arbeit|ausbildung|erfahrung|kenntnisse|fähigkeiten/i.test(profileText)) {
        inferredLanguage = 'german';
      }
    }
    
    // Update CV with the inferred language
    if (cv.structuredData) {
      cv.structuredData.language = inferredLanguage;
      await updateCV(cv);
      
      logger.info(`CV ${urlId} language set to ${inferredLanguage}`);
      return res.json({ 
        success: true, 
        message: `CV language set to ${inferredLanguage}`,
        language: inferredLanguage
      });
    } else {
      return res.status(400).json({ error: 'CV has no structured data to update' });
    }
    
  } catch (error) {
    logger.error('Error reprocessing CV language:', error);
    res.status(500).json({ error: 'Error reprocessing CV language' });
  }
};

/**
 * Generate a placeholder PDF page that links to the interactive CV
 */
async function generatePlaceholderPage(cv) {
  try {
    if (!cv || !cv.structuredData || !cv.structuredData.personalInfo) {
      logger.error('Invalid CV data for placeholder page generation');
      return null;
    }

    const name = cv.structuredData.personalInfo.name || 'CV Owner';
    const viewUrl = cv.customUrlName ? `/${cv.customUrlName}` : `/view-cv/${cv.urlId}`;
    const baseUrl = process.env.DOMAIN || 'https://cvgenius.app';
    const fullUrl = `${baseUrl}${viewUrl}`;

    // Create the HTML for the placeholder page
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} - Interactive CV</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        body {
            background-color: #f5f7fa;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        
        .logo {
            margin-bottom: 40px;
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
        }
        
        h1 {
            font-size: 2.5rem;
            margin-bottom: 24px;
            color: #2c3e50;
        }
        
        p {
            font-size: 1.2rem;
            margin-bottom: 40px;
            max-width: 600px;
        }
        
        .cta-button {
            display: inline-block;
            background-color: #3498db;
            color: white;
            padding: 16px 32px;
            border-radius: 50px;
            font-size: 1.2rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.3s ease;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border: none;
        }
        
        .cta-button:hover {
            background-color: #2980b9;
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
        }
        
        .cta-button:active {
            transform: translateY(0);
        }
        
        .benefits {
            margin-top: 50px;
            display: flex;
            justify-content: space-around;
            width: 100%;
            flex-wrap: wrap;
        }
        
        .benefit {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            margin: 10px;
            flex: 1 1 200px;
            max-width: 250px;
        }
        
        .benefit h3 {
            margin-bottom: 10px;
            color: #2c3e50;
        }
        
        .arrow {
            margin-left: 8px;
            display: inline-block;
            transition: transform 0.3s ease;
        }
        
        .cta-button:hover .arrow {
            transform: translateX(5px);
        }
        
        @media (max-width: 600px) {
            h1 {
                font-size: 1.8rem;
            }
            
            p {
                font-size: 1rem;
            }
            
            .cta-button {
                padding: 12px 24px;
                font-size: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">${name}</div>
        
        <h1>Interactive Curriculum Vitae</h1>
        
        <p>
            Welcome to my interactive CV, specifically designed to help recruiters like you save time and quickly find the information you need.
        </p>
        
        <a href="${fullUrl}" class="cta-button">
            View Interactive CV <span class="arrow">→</span>
        </a>
        
        <div class="benefits">
            <div class="benefit">
                <h3>Time-Saving</h3>
                <p>Navigate to sections that matter most to you with a single click</p>
            </div>
            
            <div class="benefit">
                <h3>Interactive</h3>
                <p>Explore projects, skills, and experience through an intuitive interface</p>
            </div>
            
            <div class="benefit">
                <h3>Comprehensive</h3>
                <p>All details organized in a recruiter-friendly format</p>
            </div>
        </div>
    </div>
</body>
</html>`;

    // Set the placeholder page HTML to the CV object
    cv.placeholderPage = html;
    cv.placeholderGenerated = new Date();
    
    logger.info(`Generated placeholder page for CV: ${cv.urlId}`);
    return html;
  } catch (error) {
    logger.error('Error generating placeholder page:', error);
    return null;
  }
}

exports._internal = {
  findCVByUrlId,
  findCVByCustomUrlName,
  saveCV,
  updateCV,
  hasAnalyticsAccess,
  generatePlaceholderPage
};