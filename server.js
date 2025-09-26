// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Import routes
const emailRoutes = require('./routes/emailRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const qrRoutes = require('./routes/qrRoutes');
const sitemapRoutes = require('./routes/sitemapRoutes');
const notesRoutes = require('./routes/notesRoutes');
const articleRoutes = require('./routes/articleRoutes');
const adminRoutes = require('./routes/adminRoutes');


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:5000',
    'http://127.0.0.1:5500', // For local development
    'https://worktoolshub.info',
    'https://www.worktoolshub.info',
    'https://wthv2.vercel.app', 
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}



const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      console.error('MongoDB URI not found in environment variables');
      return;
    }

    console.log('Connecting to MongoDB...');
    console.log("MongoDB URI value:", mongoUri);

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30s timeout for initial server selection
      socketTimeoutMS: 45000, // 45s for socket inactivity
      maxPoolSize: 10, // Maintain up to 10 connections
      minPoolSize: 1,  // Min 1 connection (avoid forcing 5)
      maxIdleTimeMS: 30000, // Reclaim idle connections
    });

    console.log('✅ MongoDB connected successfully');

    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected successfully');
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);

    if (error.name === 'MongooseServerSelectionError') {
      console.log('Connection troubleshooting tips:');
      console.log('• Check if MongoDB URI is correct');
      console.log('• Verify network access (IP whitelist in Atlas)');
      console.log('• Ensure database service is running');
      console.log('• Check firewall settings');
    }

    console.log('Server will continue with limited functionality');
  }
};

// Connect to database
connectDB();



// Test MongoDB connection with extra details
app.get('/api/test-db', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const stateText = states[dbState] || 'unknown';

    if (dbState !== 1) {
      return res.json({
        status: stateText,
        message: 'Database not connected',
      });
    }

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    // Optional: count docs in each collection
    const collectionInfo = {};
    for (const coll of collections) {
      const name = coll.name;
      try {
        const count = await db.collection(name).countDocuments();
        collectionInfo[name] = { count };
      } catch (err) {
        collectionInfo[name] = { error: err.message };
      }
    }

    res.json({
      status: stateText,
      message: 'Database connected',
      database: db.databaseName,
      collections: collectionInfo,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// API Routes
app.use('/api/email', emailRoutes);
app.use('/api', uploadRoutes);
app.use('/api', qrRoutes);
app.use('/api', sitemapRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/knowledge-base', articleRoutes);

console.log('adminRoutes type:', typeof adminRoutes);
console.log('adminRoutes:', adminRoutes);
app.use('/api', adminRoutes);


// Sitemap.xml endpoint
app.get('/sitemap.xml', (req, res) => {
  res.redirect(301, '/api/sitemap.xml');
});

// Robots.txt endpoint  
app.get('/robots.txt', (req, res) => {
  res.redirect(301, '/api/robots.txt');
});

// Authentication endpoint
app.post('/api/auth/verify-email', (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        authorized: false, 
        message: 'Email is required' 
      });
    }

    const authorizedEmails = process.env.AUTHORIZED_EMAILS?.split(',') || [];
    const normalizedEmail = email.toLowerCase().trim();
    const isAuthorized = authorizedEmails.includes(normalizedEmail);
    
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

// Enhanced health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      auth: 'Available',
      email: 'Available',
      database: dbStatus,
      knowledgeBase: 'Available',
      ai: process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'
    }
  });
});

// Enhanced API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'WorkToolsHub API',
    version: '2.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/verify-email': 'Verify user email authorization'
      },
      email: {
        'POST /api/email/generate-escalation-email': 'Generate escalation emails',
        'POST /api/email/generate-lbl-email': 'Generate business listing update emails',
        'GET /api/email/health': 'Email service health check'
      },
      knowledgeBase: {
        'GET /api/knowledge-base/articles': 'Get all articles',
        'GET /api/knowledge-base/articles/:id': 'Get single article',
        'POST /api/knowledge-base/articles': 'Create new article',
        'POST /api/knowledge-base/articles/:id/upvote': 'Upvote an article',
        'POST /api/knowledge-base/articles/:id/helpful': 'Mark article as helpful',
        'POST /api/knowledge-base/edit-suggestions': 'Submit edit suggestion',
        'POST /api/knowledge-base/ai-query': 'Query AI assistant'
      },
      system: {
        'GET /api/health': 'System health check',
        'GET /api/docs': 'API documentation'
      },
      pages: {
        'GET /knowledge-base': 'Knowledge Base interface',
        'GET /article': 'Individual article page'
      }
    }
  });
});

// Homepage for API
app.get('/', (req, res) => {
  res.json({ 
    message: 'WorkToolsHub API Server',
    status: 'running',
    version: '2.0.0',
    documentation: '/api/docs',
    health: '/api/health',
    knowledgeBase: '/knowledge-base'
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
  console.log(`📚 Knowledge Base: http://localhost:${PORT}/knowledge-base`);
  
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  console.log("MongoDB URI configured:", mongoUri ? 'Yes' : 'No');
  
  if (!process.env.AUTHORIZED_EMAILS) {
    console.warn('⚠️  WARNING: AUTHORIZED_EMAILS not set in environment variables');
  }
  
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  WARNING: OPENAI_API_KEY not set - AI assistant will not work');
  }

  if (!mongoUri) {
    console.warn('⚠️  WARNING: MongoDB URI not configured - database features disabled');
  }
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n📴 Received ${signal}. Shutting down gracefully...`);
  
  server.close(async () => {
    console.log('📴 HTTP server closed');
    
    try {
      await mongoose.connection.close();
      console.log('📴 Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
    }
    
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;