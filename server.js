// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();


// Import routes
const emailRoutes = require('./routes/emailRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const qrRoutes = require('./routes/qrRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'https://worktoolshub.info',
    'https://www.worktoolshub.info',
    'https://wthv2.vercel.app', 
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (optional)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use('/api/email', emailRoutes);
app.use('/api', uploadRoutes);
app.use('/api', qrRoutes);

// Authentication endpoint (keep this here since it's not email-related)
app.post('/api/auth/verify-email', (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        authorized: false, 
        message: 'Email is required' 
      });
    }

    // Get authorized emails from environment variables
    const authorizedEmails = process.env.AUTHORIZED_EMAILS?.split(',') || [];
    const normalizedEmail = email.toLowerCase().trim();
    const isAuthorized = authorizedEmails.includes(normalizedEmail);
    
    // Log authentication attempts (optional - remove in production if not needed)
    console.log(`Auth attempt: ${email} - ${isAuthorized ? 'GRANTED' : 'DENIED'}`);
    
    res.json({ 
      authorized: isAuthorized,
      message: isAuthorized ? 'Access granted' : 'Access denied'
    });
    
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      authorized: false, 
      message: 'Internal server error' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      auth: 'Available',
      email: 'Available',
      ai: process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'
    }
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'WorkToolsHub API',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/verify-email': 'Verify user email authorization'
      },
      email: {
        'POST /api/email/generate-escalation-email': 'Generate escalation emails',
        'POST /api/email/generate-lbl-email': 'Generate business listing update emails',
        'GET /api/email/health': 'Email service health check'
      },
      system: {
        'GET /api/health': 'System health check',
        'GET /api/docs': 'API documentation'
      }
    }
  });
});

// Homepage for API
app.get('/', (req, res) => {
  res.json({ 
    message: 'WorkToolsHub API Server',
    status: 'running',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/api/health'
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    availableEndpoints: '/api/docs'
  });
});

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: isDevelopment ? error.message : 'Something went wrong',
    ...(isDevelopment && { stack: error.stack })
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Auth emails: ${process.env.AUTHORIZED_EMAILS ? 'Configured' : 'Not configured'}`);
  console.log(`🤖 OpenAI API: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`📖 API docs: http://localhost:${PORT}/api/docs`);
  
  if (!process.env.AUTHORIZED_EMAILS) {
    console.warn('⚠️  WARNING: AUTHORIZED_EMAILS not set in environment variables');
  }
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY not set - email generation will fail');
  }
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n📴 Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('📴 Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app; // For testing purposes
