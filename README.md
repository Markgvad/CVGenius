# CVGenius - CV Generation and Hosting Platform

## Project Overview

CVGenius is a web application that allows users to:
- Upload CV/resume documents (PDF, DOC, DOCX)
- Extract structured data using Claude AI
- Edit and customize CV content
- Generate professional HTML CVs 
- Host CVs with custom URLs
- Track CV view analytics

## Restructured Project

This repository contains a restructured version of the CVGenius application with:
- Improved code organization
- Enhanced security practices
- Better error handling
- Simplified data models

## Directory Structure

```
- app/
  - config/       # Configuration files (database, env, etc.)
  - controllers/  # Business logic for route handlers
  - middleware/   # Express middleware (auth, error handling, etc.)
  - models/       # Mongoose data models
  - routes/       # Express routes
  - services/     # Service modules (auth, CV generation, etc.)
  - utils/        # Utility functions and helpers
- public/         # Static assets and frontend code
- uploads/        # User file uploads
- .env.example    # Example environment variables configuration
- server.js       # Application entry point
```

## Setup Instructions

1. **Clone the repository**
   ```
   git clone https://github.com/your-username/cvgenius.git
   cd cvgenius
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Set up environment variables**
   ```
   cp .env.example .env
   ```
   Edit the `.env` file and add your:
   - Stripe API keys
   - Anthropic Claude API key
   - MongoDB connection string
   - JWT secret

4. **Start MongoDB**
   ```
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo
   
   # Or use a local MongoDB installation
   ```

5. **Start the application**
   ```
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## Deployment on Render.com

This application is configured for seamless deployment on Render.com.

### Environment Variables

The following environment variables need to be set in your Render.com dashboard:

- `NODE_ENV` - Set to "production"
- `PORT` - Default is 10000 for Render.com
- `DOMAIN` - Your application's full URL (e.g., https://cvgenius.onrender.com)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token generation
- `SESSION_SECRET` - Secret for Express sessions
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `ANTHROPIC_API_KEY` - Claude API key
- `ANTHROPIC_MODEL` - Claude model name (default: claude-3-7-sonnet-20250219)

### Deployment Steps

1. Connect your repository to Render
2. Create a new Web Service
3. Use the settings from render.yaml or configure manually:
   - Environment: Node
   - Build Command: `npm ci && chmod +x start.sh`
   - Start Command: `./start.sh`
   - Set all required environment variables

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user profile

### CV Management
- `POST /api/cv/upload` - Upload a new CV
- `GET /api/cv/:urlId` - Get CV data
- `POST /api/cv/:urlId` - Update CV data
- `POST /api/generate-html/:urlId` - Generate HTML from CV data
- `DELETE /api/cv/:urlId` - Delete a CV

### Payments
- `POST /api/payments/create-checkout-session` - Create Stripe checkout session
- `GET /api/payments/subscription-status` - Get user's subscription status
- `POST /api/payments/webhook` - Stripe webhook handler
- `POST /api/payments/verify-session` - Verify Stripe session after payment

### Analytics
- `GET /api/analytics/cv/:urlId` - Get analytics for a specific CV
- `GET /api/analytics/user` - Get analytics for all user's CVs
- `POST /api/analytics/cv/:urlId/view` - Track CV view
- `POST /api/analytics/cv/:urlId/section/:sectionId` - Track section interaction

## Features

### Subscription Tiers
- **Free**: 1 CV, 3-month access
- **Standard**: 1 CV, 1-year access 
- **Premium**: 3 CVs, analytics features, 1-year access

### CV Analysis
- Extract structured data from CV documents using Claude AI
- Parse skills, experience, education, and personal details
- Generate structured JSON representation of the CV

### CV Hosting
- Host CVs with custom URLs
- Track view statistics and section interactions
- Generate printable versions of CVs

## Technologies Used

- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Authentication**: JWT, bcrypt
- **File Processing**: pdf-parse, mammoth
- **AI Integration**: Anthropic Claude API
- **Payment Processing**: Stripe
- **Frontend**: HTML, CSS, JavaScript