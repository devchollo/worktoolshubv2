// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'https://wthv2.vercel.app', // Add your Vercel URL
    'https://*.vercel.app' // Or allow all Vercel subdomains
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.static('public'));

// API Routes
// Email verification endpoint
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
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve your main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'views', 'index.html'));
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path 
  });
});

// Handle all other routes by serving index.html (for SPA routing if needed)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'views', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🔐 Auth emails loaded: ${process.env.AUTHORIZED_EMAILS ? 'YES' : 'NO'}`);
  
  if (!process.env.AUTHORIZED_EMAILS) {
    console.warn('⚠️  WARNING: AUTHORIZED_EMAILS not set in environment variables');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Server shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Server shutting down gracefully...');
  process.exit(0);
});