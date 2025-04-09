// models/cv.js
const mongoose = require('mongoose');

const cvSchema = new mongoose.Schema({
  urlId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  customUrlName: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  fileName: String,
  fileSize: Number,
  fileType: String,
  // GCS-specific fields
  fileUrl: String,   // Public URL to access the file in GCS
  gcsPath: String,   // GCS path identifier for the file
  structuredData: Object,
  html: String,
  placeholderPage: String,
  placeholderGenerated: {
    type: Date,
    default: null
  },
  uploadDate: { 
    type: Date, 
    default: Date.now 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  views: {
    type: Number,
    default: 0
  },
  sectionInteractions: [{
    sectionId: String,
    sectionTitle: String,
    clicks: {
      type: Number,
      default: 1
    },
    lastClicked: {
      type: Date,
      default: Date.now
    }
  }],
  lastViewed: Date
});

module.exports = mongoose.model('CV', cvSchema);