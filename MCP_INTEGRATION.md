# MCP Integration for CVGenius

This document explains how to set up and use the Model Context Protocol (MCP) integration with CVGenius. MCP allows the application to communicate with Claude and other LLMs directly, providing better context management and database access capabilities.

## Overview

The CVGenius application now supports two modes of interaction with Claude:
1. **Direct API Mode** - Uses the traditional REST API to communicate with Claude (default)
2. **MCP Mode** - Uses the Model Context Protocol to provide Claude with direct access to contextual data

## Benefits of MCP

- **Direct Data Access**: Claude can access the MongoDB database directly through MCP
- **Reduced Token Usage**: More efficient communication by sending structured context instead of text
- **Better Context Management**: MCP provides specialized context management tools
- **Extensibility**: Easier to add more context providers as your application grows

## Setup Instructions

### 1. Install Dependencies

The MCP client requires specific dependencies. Run:

```bash
npm install
```

### 2. Configure Environment Variables

Set the following in your `.env` file:

```
# MCP Configuration
USE_MCP=true
MCP_SERVER_URL=http://localhost:5001
MCP_AUTH_TOKEN=optional_auth_token
```

- `USE_MCP`: Set to "true" to enable MCP mode, "false" for direct API mode
- `MCP_SERVER_URL`: URL where your MCP server is running
- `MCP_AUTH_TOKEN`: Optional authentication token for the MCP server

### 3. Start the MCP MongoDB Server

Before starting the CVGenius application, start the MCP MongoDB server:

```bash
cd ../mcp-mongo-server
npm install
npm run build
node run-server.js
```

The server should output something like: `MCP server listening on port 5001`

### 4. Start the CVGenius Application

```bash
cd ../kage1_restructured
npm run dev
```

## How It Works

The application now has a dual-mode architecture:

1. **Initialize MCP Client**  
   When the application starts, it attempts to initialize an MCP client if `USE_MCP=true`.

2. **Fallback Mechanism**  
   If MCP initialization fails or `USE_MCP=false`, the app falls back to direct API calls.

3. **Service Integration**  
   The CV data extraction and HTML generation services now support both modes.

## Feature Status

| Feature | MCP Support | Notes |
|---------|-------------|-------|
| CV Data Extraction | ✅ | Uses Claude via MCP to extract structured data from CVs |
| HTML Generation | ✅ | Uses Claude via MCP to generate HTML for CVs |
| MongoDB Access | ✅ | MCP provides direct database access |

## Troubleshooting

1. **MCP Server Connection Issues**:
   - Check that the MCP server is running
   - Verify the `MCP_SERVER_URL` is correct
   - Check network connectivity between the application and MCP server

2. **MongoDB Connection Issues**:
   - Verify MongoDB connection string in your MCP server config
   - Check MongoDB is running and accessible

3. **Authentication Issues**:
   - Verify the `MCP_AUTH_TOKEN` matches the server configuration
   - Check server logs for authentication errors

## Monitoring

The application logs MCP status during startup:
- `Using MCP for CV data extraction` - Indicates MCP is being used
- `Using direct API call for CV data extraction` - Indicates fallback to direct API

Check the logs at startup for any MCP initialization errors.

## Further Improvements

Future enhancements planned for the MCP integration:

1. Support for transaction operations in MongoDB via MCP
2. Additional context providers for external data sources
3. Caching layer for optimized MCP interactions
4. Metrics and monitoring for MCP performance

---

For more information about MCP, see the [MCP MongoDB Server documentation](../mcp-mongo-server/USAGE.md).