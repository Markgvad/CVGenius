// services/mcp/mcpClient.js - Mock implementation
const logger = require('../../utils/logger');

/**
 * Creates and initializes the MCP client
 * @returns {Promise<Object>} A mock MCP client
 */
exports.initializeMCPClient = async () => {
  try {
    logger.info('MCP client is disabled - using mock implementation');
    return {
      initialized: true,
      mock: true
    };
  } catch (error) {
    logger.error('Failed to initialize mock MCP client:', error);
    throw error;
  }
};

/**
 * Sends a request to the model via MCP
 * @param {Object} client - The MCP client instance (ignored in mock)
 * @param {Object} options - Request options
 * @returns {Promise<Object>} A mock response
 */
exports.sendModelRequest = async (client, options) => {
  logger.debug('Mock MCP: Request would have been sent with options:', { 
    model: options.model,
    max_tokens: options.max_tokens,
    temperature: options.temperature
  });
  
  // Return mock response indicating MCP is not available
  return {
    content: "MCP mode is disabled. Using direct API instead.",
    mockResponse: true
  };
};

/**
 * Executes a MongoDB operation via MCP
 * @param {Object} client - The MCP client instance (ignored in mock)
 * @param {string} operation - The MongoDB operation to perform
 * @param {Object} params - The parameters for the operation
 * @returns {Promise<Object>} A mock result
 */
exports.executeMongoDBOperation = async (client, operation, params) => {
  logger.debug(`Mock MCP: MongoDB operation ${operation} would have been executed`);
  
  // Return mock result
  return { mockResult: true, operation };
};