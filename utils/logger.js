// utils/logger.js
/**
 * Simple logger utility that enhances console logging with timestamps and log levels
 */
const logger = {
  info: (...args) => {
    console.log(`[INFO] [${new Date().toISOString()}]`, ...args);
  },
  
  warn: (...args) => {
    console.warn(`[WARN] [${new Date().toISOString()}]`, ...args);
  },
  
  error: (...args) => {
    console.error(`[ERROR] [${new Date().toISOString()}]`, ...args);
  },
  
  debug: (...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] [${new Date().toISOString()}]`, ...args);
    }
  }
};

module.exports = logger;