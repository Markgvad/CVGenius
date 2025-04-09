// services/storage/gcsService.js
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');
const { format } = require('util');
const logger = require('../../utils/logger');

class GCSService {
  constructor() {
    this.initializeStorage();
  }

  initializeStorage() {
    try {
      // Initialize storage with credentials from environment or service account
      this.storage = new Storage({
        // Using environment variables for credentials or default application credentials
        projectId: process.env.GCS_PROJECT_ID
      });
      
      this.bucketName = process.env.GCS_BUCKET_NAME || 'cvgenius-picture';
      logger.info(`GCS Storage initialized with bucket: ${this.bucketName}`);
    } catch (error) {
      logger.error('Failed to initialize Google Cloud Storage:', error);
      throw error;
    }
  }

  /**
   * Get or create the bucket for file storage
   */
  async getBucket() {
    try {
      const [buckets] = await this.storage.getBuckets();
      const bucket = buckets.find(b => b.name === this.bucketName);
      
      if (bucket) {
        return this.storage.bucket(this.bucketName);
      }

      // Create the bucket if it doesn't exist
      logger.info(`Creating new GCS bucket: ${this.bucketName}`);
      const [newBucket] = await this.storage.createBucket(this.bucketName, {
        location: process.env.GCS_BUCKET_LOCATION || 'us-central1',
        storageClass: 'STANDARD'
      });
      
      return newBucket;
    } catch (error) {
      logger.error('Error getting or creating bucket:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Google Cloud Storage
   * @param {Object} file - The file object from multer
   * @param {string} folder - Optional folder path within the bucket
   * @param {boolean} keepLocalFile - Whether to keep the local file after upload (default: false)
   * @returns {Promise<string>} - The public URL of the uploaded file
   */
  async uploadFile(file, folder = '', keepLocalFile = false) {
    try {
      const bucket = await this.getBucket();
      
      // Create a unique filename
      const uniqueFilename = Date.now() + '-' + file.originalname.replace(/\s+/g, '-');
      const destFilename = folder ? `${folder}/${uniqueFilename}` : uniqueFilename;
      
      // Upload the file to the bucket
      const blob = bucket.file(destFilename);
      const blobStream = blob.createWriteStream({
        resumable: false,
        metadata: {
          contentType: file.mimetype
        }
        // No ACL parameters for uniform bucket-level access
      });

      // Return a promise that resolves with the public URL when the upload is complete
      return new Promise((resolve, reject) => {
        blobStream.on('error', (error) => {
          logger.error('Error uploading to GCS:', error);
          reject(error);
        });

        blobStream.on('finish', async () => {
          try {
            // Generate a public URL
            // With uniform bucket-level access, this requires the bucket to be publicly readable
            // or use a signed URL if needed
            const publicUrl = format(
              `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(blob.name)}`
            );
            
            // Alternative: Generate a signed URL that expires after a set time
            // This works even if the bucket is not public
            const [signedUrl] = await blob.getSignedUrl({
              action: 'read',
              expires: Date.now() + 15 * 24 * 60 * 60 * 1000, // 15 days
            });
            
            logger.info(`File uploaded to GCS: ${publicUrl}`);
            logger.info(`Signed URL available: ${signedUrl}`);
            
            resolve({
              filename: uniqueFilename,
              path: destFilename,
              publicUrl,
              signedUrl
            });
          } catch (error) {
            logger.error('Error generating URLs:', error);
            reject(error);
          }
        });

        try {
          // Pipe the file data to GCS only if file exists
          if (fs.existsSync(file.path)) {
            const readStream = fs.createReadStream(file.path);
            
            // Handle read errors
            readStream.on('error', (readError) => {
              logger.error(`Error reading file: ${file.path}`, readError);
              reject(readError);
            });
            
            readStream.pipe(blobStream);
            
            // Only delete the local file if not explicitly asked to keep it
            readStream.on('end', () => {
              if (!keepLocalFile) {
                // Add a small delay to ensure stream is fully closed
                setTimeout(() => {
                  if (fs.existsSync(file.path)) {
                    fs.unlink(file.path, (err) => {
                      if (err) {
                        logger.warn(`Failed to delete local file after GCS upload: ${file.path}`, err);
                      } else {
                        logger.debug(`Local file deleted after GCS upload: ${file.path}`);
                      }
                    });
                  }
                }, 500); // 500ms delay
              } else {
                logger.info(`Keeping local file after GCS upload as requested: ${file.path}`);
              }
            });
          } else {
            // If we don't have a file, reject or use a fallback
            logger.error(`File not found at path: ${file.path}`);
            reject(new Error(`File not found at path: ${file.path}`));
          }
        } catch (streamError) {
          logger.error(`Error setting up file stream: ${file.path}`, streamError);
          reject(streamError);
        }
      });
    } catch (error) {
      logger.error('Error in GCS upload:', error);
      throw error;
    }
  }

  /**
   * Delete a file from Google Cloud Storage
   * @param {string} filePath - The path of the file in the bucket
   */
  async deleteFile(filePath) {
    try {
      const bucket = await this.getBucket();
      await bucket.file(filePath).delete();
      logger.info(`File deleted from GCS: ${filePath}`);
    } catch (error) {
      logger.error(`Error deleting file from GCS: ${filePath}`, error);
      throw error;
    }
  }
}

// Singleton instance
const gcsService = new GCSService();
module.exports = gcsService;