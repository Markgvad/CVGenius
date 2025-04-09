// config/db.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// MongoDB connection
const connect = async () => {
  const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/cvgenius';
  logger.info('Attempting to connect to MongoDB at:', mongoUrl);

  try {
    await mongoose.connect(mongoUrl);
    logger.info('Connected to MongoDB');
    return true;
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    return false;
  }
};

// MongoDB event handlers
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB successfully');
  logger.info('MongoDB connection state:', mongoose.connection.readyState);
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.info('Mongoose disconnected');
});

module.exports = { connect };