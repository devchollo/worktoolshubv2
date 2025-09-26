// server.js
const express = require("express");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// Import routes
const emailRoutes = require("./routes/emailRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const qrRoutes = require("./routes/qrRoutes");
const sitemapRoutes = require("./routes/sitemapRoutes");
const notesRoutes = require("./routes/notesRoutes");
const articleRoutes = require("./routes/articleRoutes");

// Import Admin model
const Admin = require("./models/Admin");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5000",
      "http://127.0.0.1:5500", // For local development
      "https://worktoolshub.info",
      "https://www.worktoolshub.info",
      "https://wthv2.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Pragma",
      "Expires",
      "X-Requested-With",
      "JWT_SECRET",
      "jwt_secret",
      "jwt-secret",
      'x-jwt-secret'
    ],
    credentials: true,
  })
);

app.use("/api/knowledge-base/articles", (req, res, next) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
  });
  next();
});

app.options("*", cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// Request logging middleware
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      console.error("MongoDB URI not found in environment variables");
      return;
    }

    console.log("Connecting to MongoDB...");
    console.log("MongoDB URI value:", mongoUri);

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30s timeout for initial server selection
      socketTimeoutMS: 45000, // 45s for socket inactivity
      maxPoolSize: 10, // Maintain up to 10 connections
      minPoolSize: 1, // Min 1 connection (avoid forcing 5)
      maxIdleTimeMS: 30000, // Reclaim idle connections
    });

    console.log("✅ MongoDB connected successfully");

    // Run cleanup tasks on startup
    try {
      await Admin.cleanupExpiredSessions();
      console.log("✅ Cleaned up expired admin sessions");
    } catch (cleanupError) {
      console.warn("⚠️ Session cleanup failed:", cleanupError.message);
    }

    // Connection event listeners
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB reconnected successfully");
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);

    if (error.name === "MongooseServerSelectionError") {
      console.log("Connection troubleshooting tips:");
      console.log("• Check if MongoDB URI is correct");
      console.log("• Verify network access (IP whitelist in Atlas)");
      console.log("• Ensure database service is running");
      console.log("• Check firewall settings");
    }

    console.log("Server will continue with limited functionality");
  }
};

// Connect to database
connectDB();

// Test MongoDB connection with extra details
app.get("/api/test-db", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = ["disconnected", "connected", "connecting", "disconnecting"];
    const stateText = states[dbState] || "unknown";

    if (dbState !== 1) {
      return res.json({
        status: stateText,
        message: "Database not connected",
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
      message: "Database connected",
      database: db.databaseName,
      collections: collectionInfo,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Routes
app.use("/api/email", emailRoutes);
app.use("/api", uploadRoutes);
app.use("/api", qrRoutes);
app.use("/api", sitemapRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/knowledge-base", articleRoutes);

// Admin authentication routes
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Helper function to validate JWT secret
const validateJWTSecret = (req) => {
  const jwtSecret = req.headers['x-api-key'] ||           
                   req.headers['authorization']?.replace(/^Bearer\s+/, '') || 
                   req.headers['x-jwt-secret'] ||
                   req.headers['X-JWT-Secret'] ||           
                   req.headers['jwt_secret'] || 
                   req.headers['JWT_SECRET'] || 
                   req.headers['jwt-secret'] ||
                   req.body.jwt_secret ||                 
                   req.query.jwt_secret;                  
  
  return jwtSecret === process.env.JWT_SECRET ? jwtSecret : null;
};

// Middleware to extract client info
const getClientInfo = (req) => {
  return {
    userAgent: req.get('User-Agent') || 'Unknown',
    ipAddress: req.ip || req.connection.remoteAddress || 'Unknown'
  };
};

app.post("/api/admin/register", async (req, res) => {
  try {
    // Debug: log all headers
    console.log('All headers received:', JSON.stringify(req.headers, null, 2));
    
    const jwtSecret = validateJWTSecret(req);
    
    console.log('JWT_SECRET found:', jwtSecret ? '***FOUND***' : 'NOT FOUND');
    console.log('Environment JWT_SECRET exists:', process.env.JWT_SECRET ? 'YES' : 'NO');
    
    if (!jwtSecret) {
      return res.status(401).json({ 
        error: "JWT_SECRET is required",
        receivedHeaders: Object.keys(req.headers),
        solutions: [
          "Try using 'X-API-Key' header",
          "Try using 'Authorization: Bearer your-secret' header", 
          "Try passing jwt_secret in request body",
          "Try passing jwt_secret as query parameter: ?jwt_secret=your-secret"
        ]
      });
    }

    const { email, password, name, avatar, role, department, phone, permissions } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: "Email, password, and name are required" 
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findByEmail(email);
    if (existingAdmin) {
      return res.status(400).json({ error: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newAdmin = new Admin({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      avatar,
      role: role || "Administrator",
      department,
      phone,
      permissions
    });

    await newAdmin.save();

    // Return admin data (password excluded by toJSON transform)
    res.status(201).json({ 
      message: "Admin registered successfully",
      admin: newAdmin.toJSON()
    });
  } catch (error) {
    console.error("Admin registration error:", error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: "Admin with this email already exists" });
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ error: "Validation failed", details: errors });
    }
    
    res.status(500).json({ error: "Registration failed" });
  }
});

app.put("/api/admin/edit", async (req, res) => {
  try {
    const jwtSecret = validateJWTSecret(req);
    
    if (!jwtSecret) {
      return res.status(401).json({ error: "JWT_SECRET is required" });
    }

    const { id, email, password, name, avatar, role, isActive, department, phone, permissions } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Encountered an issue with grabbing the user's _id" });
    }

    const admin = await Admin.findByEmail(email);
    if (!id) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Update fields if provided
    if (name) admin.name = name;
    if (avatar) admin.avatar = avatar;
    if (role) admin.role = role;
    if (typeof isActive === 'boolean') admin.isActive = isActive;
    if (department !== undefined) admin.department = department;
    if (phone !== undefined) admin.phone = phone;
    if (permissions) admin.permissions = permissions;
    
    // Hash new password if provided
    if (password) {
      admin.password = await bcrypt.hash(password, 12);
    }

    await admin.save();

    res.json({ 
      message: "Admin updated successfully", 
      admin: admin.toJSON()
    });
  } catch (error) {
    console.error("Admin update error:", error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ error: "Validation failed", details: errors });
    }
    
    res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/api/admin/delete", async (req, res) => {
  try {
    const jwtSecret = validateJWTSecret(req);
    
    if (!jwtSecret) {
      return res.status(401).json({ error: "JWT_SECRET is required" });
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const admin = await Admin.findByEmail(email);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Get admin info before deletion (for response)
    const adminResponse = admin.toJSON();

    // Delete the admin
    await Admin.deleteOne({ email: email.toLowerCase() });

    res.json({ 
      message: "Admin deleted successfully", 
      deletedAdmin: adminResponse 
    });
  } catch (error) {
    console.error("Admin deletion error:", error);
    res.status(500).json({ error: "Deletion failed" });
  }
});

app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientInfo = getClientInfo(req);

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const admin = await Admin.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    });

    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({ 
        error: "Account temporarily locked due to too many failed login attempts",
        lockUntil: admin.lockUntil
      });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      // Increment login attempts
      await admin.incLoginAttempts();
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Reset login attempts on successful login
    await admin.resetLoginAttempts();

    // Generate session ID and add to admin's sessions
    const crypto = require('crypto');
    const sessionId = crypto.randomUUID();
    await admin.addSession(sessionId, clientInfo.userAgent, clientInfo.ipAddress);

    const token = jwt.sign(
      { 
        id: admin._id,
        email: admin.email, 
        role: admin.role,
        sessionId: sessionId
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        avatar: admin.avatarUrl,
        permissions: admin.permissions,
        lastLogin: admin.lastLogin,
        department: admin.department
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/admin/logout", async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    const admin = await Admin.findByEmail(decoded.email);
    
    if (admin && decoded.sessionId) {
      await admin.removeSession(decoded.sessionId);
    }

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
});

app.post("/api/admin/verify", async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    
    const admin = await Admin.findOne({ 
      email: decoded.email,
      isActive: true 
    });
    
    if (!admin) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Optionally verify session is still active
    if (decoded.sessionId) {
      const hasValidSession = admin.sessionIds.some(
        session => session.sessionId === decoded.sessionId
      );
      
      if (!hasValidSession) {
        return res.status(401).json({ error: "Session expired" });
      }
    }

    res.json({
      user: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        avatar: admin.avatarUrl,
        permissions: admin.permissions,
        lastLogin: admin.lastLogin,
        department: admin.department
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// New endpoint to list all admins (protected)
app.get("/api/admin/list", async (req, res) => {
  try {
    const jwtSecret = validateJWTSecret(req);
    
    if (!jwtSecret) {
      return res.status(401).json({ error: "JWT_SECRET is required" });
    }

    const { page = 1, limit = 10, role, isActive, search } = req.query;
    
    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    const admins = await Admin.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await Admin.countDocuments(filter);
    
    res.json({
      admins,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Admin list error:", error);
    res.status(500).json({ error: "Failed to fetch admins" });
  }
});

// New endpoint to get admin statistics
app.get("/api/admin/stats", async (req, res) => {
  try {
    const jwtSecret = validateJWTSecret(req);
    
    if (!jwtSecret) {
      return res.status(401).json({ error: "JWT_SECRET is required" });
    }

    const stats = await Admin.getStats();
    const roleStats = await Admin.countByRole();
    
    res.json({
      ...stats,
      roleBreakdown: roleStats
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Sitemap.xml endpoint
app.get("/sitemap.xml", (req, res) => {
  res.redirect(301, "/api/sitemap.xml");
});

// Robots.txt endpoint
app.get("/robots.txt", (req, res) => {
  res.redirect(301, "/api/robots.txt");
});

// Authentication endpoint
app.post("/api/auth/verify-email", (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        authorized: false,
        message: "Email is required",
      });
    }

    const authorizedEmails = process.env.AUTHORIZED_EMAILS?.split(",") || [];
    const normalizedEmail = email.toLowerCase().trim();
    const isAuthorized = authorizedEmails.includes(normalizedEmail);

    console.log(
      `Auth attempt: ${email} - ${isAuthorized ? "GRANTED" : "DENIED"}`
    );

    res.json({
      authorized: isAuthorized,
      message: isAuthorized ? "Access granted" : "Access denied",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      authorized: false,
      message: "Internal server error",
    });
  }
});

// Enhanced health check endpoint
app.get("/api/health", async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
  
  let adminCount = 0;
  if (mongoose.connection.readyState === 1) {
    try {
      adminCount = await Admin.countDocuments();
    } catch (error) {
      console.error("Error counting admins:", error);
    }
  }

  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    services: {
      auth: "Available",
      email: "Available",
      database: dbStatus,
      knowledgeBase: "Available",
      ai: process.env.OPENAI_API_KEY ? "Configured" : "Not configured",
      adminSystem: `${adminCount} admin(s) registered`
    },
  });
});

// Enhanced API documentation endpoint
app.get("/api/docs", (req, res) => {
  res.json({
    title: "WorkToolsHub API",
    version: "2.0.0",
    endpoints: {
      auth: {
        "POST /api/auth/verify-email": "Verify user email authorization",
      },
      admin: {
        "POST /api/admin/register": "Register new admin (requires JWT_SECRET)",
        "POST /api/admin/login": "Admin login",
        "POST /api/admin/logout": "Admin logout",
        "POST /api/admin/verify": "Verify admin token",
        "PUT /api/admin/edit": "Edit admin (requires JWT_SECRET)",
        "DELETE /api/admin/delete": "Delete admin (requires JWT_SECRET)",
        "GET /api/admin/list": "List all admins with pagination (requires JWT_SECRET)",
        "GET /api/admin/stats": "Get admin statistics (requires JWT_SECRET)"
      },
      email: {
        "POST /api/email/generate-escalation-email":
          "Generate escalation emails",
        "POST /api/email/generate-lbl-email":
          "Generate business listing update emails",
        "GET /api/email/health": "Email service health check",
      },
      knowledgeBase: {
        "GET /api/knowledge-base/articles": "Get all articles",
        "GET /api/knowledge-base/articles/:id": "Get single article",
        "POST /api/knowledge-base/articles": "Create new article",
        "POST /api/knowledge-base/articles/:id/upvote": "Upvote an article",
        "POST /api/knowledge-base/articles/:id/helpful":
          "Mark article as helpful",
        "POST /api/knowledge-base/edit-suggestions": "Submit edit suggestion",
        "POST /api/knowledge-base/ai-query": "Query AI assistant",
      },
      system: {
        "GET /api/health": "System health check",
        "GET /api/docs": "API documentation",
        "GET /api/test-db": "Database connection test"
      },
      pages: {
        "GET /knowledge-base": "Knowledge Base interface",
        "GET /article": "Individual article page",
      },
    },
  });
});

// Homepage for API
app.get("/", (req, res) => {
  res.json({
    message: "WorkToolsHub API Server",
    status: "running",
    version: "2.0.0",
    documentation: "/api/docs",
    health: "/api/health",
    knowledgeBase: "/knowledge-base",
  });
});

// Handle 404 for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found",
    path: req.path,
    availableEndpoints: "/api/docs",
  });
});

// Global error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error);

  const isDevelopment = process.env.NODE_ENV === "development";

  res.status(500).json({
    error: "Internal server error",
    message: isDevelopment ? error.message : "Something went wrong",
    ...(isDevelopment && { stack: error.stack }),
  });
});

// Cleanup task - runs every 24 hours
setInterval(async () => {
  try {
    await Admin.cleanupExpiredSessions();
    console.log("✅ Scheduled cleanup of expired admin sessions completed");
  } catch (error) {
    console.error("❌ Scheduled cleanup failed:", error);
  }
}, 24 * 60 * 60 * 1000); // 24 hours

// Start server
const server = app.listen(PORT, async () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(
    `🔐 Auth emails: ${
      process.env.AUTHORIZED_EMAILS ? "Configured" : "Not configured"
    }`
  );
  console.log(
    `🤖 OpenAI API: ${
      process.env.OPENAI_API_KEY ? "Configured" : "Not configured"
    }`
  );
  console.log(`📖 API docs: http://localhost:${PORT}/api/docs`);
  console.log(`📚 Knowledge Base: http://localhost:${PORT}/knowledge-base`);

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  console.log("MongoDB URI configured:", mongoUri ? "Yes" : "No");

  if (!process.env.AUTHORIZED_EMAILS) {
    console.warn(
      "⚠️  WARNING: AUTHORIZED_EMAILS not set in environment variables"
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      "⚠️  WARNING: OPENAI_API_KEY not set - AI assistant will not work"
    );
  }

  if (!mongoUri) {
    console.warn(
      "⚠️  WARNING: MongoDB URI not configured - database features disabled"
    );
  }

  // Log admin system status
  if (mongoose.connection.readyState === 1) {
    try {
      const adminCount = await Admin.countDocuments();
      console.log(`👥 Admin system: ${adminCount} admin(s) registered`);
      
      if (adminCount === 0) {
        console.log("💡 To register your first admin, use: POST /api/admin/register with JWT_SECRET header");
      }
    } catch (error) {
      console.warn("⚠️  Could not check admin count:", error.message);
    }
  }
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n📴 Received ${signal}. Shutting down gracefully...`);

  server.close(async () => {
    console.log("📴 HTTP server closed");

    try {
      await mongoose.connection.close();
      console.log("📴 Database connection closed");
    } catch (error) {
      console.error("Error closing database connection:", error);
    }

    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = app;