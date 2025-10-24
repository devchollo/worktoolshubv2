// server.js
const express = require("express");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");


require("dotenv").config();


// Import routes
const emailRoutes = require("./routes/emailRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const qrRoutes = require("./routes/qrRoutes");
const sitemapRoutes = require("./routes/sitemapRoutes");
const notesRoutes = require("./routes/notesRoutes");
const articleRoutes = require("./routes/articleRoutes");
const { sendAccountSetupEmail } = require("./utils/emailService");
const dnsRoutes = require('./routes/dnsRoutes');
const contactRoutes = require("./routes/contactRoutes");
const testimonialRoutes = require("./routes/testimonialRoutes");
const pdfRoutes = require('./routes/pdfRoutes');

// Import Admin model
const Admin = require("./models/Admin");
const EditSuggestion = require("./models/editSuggestions");

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Set to false initially to avoid breaking frontend
  crossOriginEmbedderPolicy: false
}));

app.use(mongoSanitize({
  replaceWith: '_'
}));

app.use(xss());


// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:5000",
      "http://127.0.0.1:5500",
      "https://worktoolshub.info",
      "https://www.worktoolshub.info",
      "https://wthv2.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Pragma",
      "Expires",
      "X-Requested-With",
    ],
    credentials: true,
  })
);

 
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { error: "Too many login attempts, please try again after 15 minutes" }
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests" }
});

// Apply general limiter to all API routes
app.use("/api/", generalLimiter);



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

// Database connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

    if (!mongoUri) {
      console.error("MongoDB URI not found in environment variables");
      return;
    }

    console.log("Connecting to MongoDB...");

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
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

connectDB();

// Authentication middleware
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

    if (!token) {
      return res.status(401).json({
        error: "Authentication required",
        message: "Please provide a valid JWT token",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    const admin = await Admin.findOne({
      email: decoded.email,
      isActive: true,
    });

    if (!admin) {
      return res.status(401).json({ error: "Invalid token or user not found" });
    }

    // Check if session is still valid
    if (decoded.sessionId) {
      const hasValidSession = admin.sessionIds.some(
        (session) => session.sessionId === decoded.sessionId
      );

      if (!hasValidSession) {
        return res.status(401).json({ error: "Session expired" });
      }
    }

    req.admin = admin;
    req.decoded = decoded;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Special middleware for initial admin registration (requires JWT_SECRET)
const validateInitialAdminSecret = (req, res, next) => {
  const jwtSecret =
    req.headers["x-jwt-secret"] ||
    req.headers["authorization"]?.replace(/^Bearer\s+/, "") ||
    req.body.jwt_secret ||
    req.query.jwt_secret;

  if (jwtSecret !== process.env.JWT_SECRET) {
    return res.status(401).json({
      error: "JWT_SECRET is required for initial admin registration",
      hint: "This is only needed for the first admin account",
    });
  }
  next();
};

// Utility functions
const getClientInfo = (req) => ({
  userAgent: req.get("User-Agent") || "Unknown",
  ipAddress: req.ip || req.connection.remoteAddress || "Unknown",
});

// API Routes (non-admin)
app.use("/api/email", emailRoutes);
app.use("/api", uploadRoutes);
app.use("/api", qrRoutes);
app.use("/api", sitemapRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/knowledge-base", articleRoutes);
app.use('/api/dns', dnsRoutes);
app.use("/api/contact", generalLimiter, contactRoutes);
app.use("/api/testimonials", testimonialRoutes);
app.use("/api", pdfRoutes);


// Test MongoDB connection
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

app.post("/api/admin/register", authLimiter, authenticateAdmin, async (req, res) => {
  try {
    const {
      email,
      name,
      avatar,
      role,
      department,
      phone,
      permissions,
    } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        error: "Email and name are required",
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findByEmail(email);
    if (existingAdmin) {
      return res.status(400).json({ error: "Admin already exists" });
    }

    // Generate setup token FIRST
    const setupToken = crypto.randomBytes(32).toString('hex');

    // Create admin with temporary password
    const newAdmin = new Admin({
      email: email.toLowerCase(),
      password: await bcrypt.hash('TEMP_' + crypto.randomBytes(16).toString('hex'), 12), // Random temp password
      name,
      avatar,
      role: role || "Admin",
      department,
      phone,
      permissions,
      passwordSetupToken: setupToken,
      passwordSetupExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      isPasswordSet: false
    });

    await newAdmin.save();

    // Send setup email
    try {
      await sendAccountSetupEmail(email, name, setupToken, role || "Admin");
      console.log(`Setup email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send setup email:', emailError);
      // Don't fail the registration if email fails
    }

    res.status(201).json({
      message: "Admin registered successfully. Setup email sent.",
      admin: newAdmin.toJSON(),
    });
  } catch (error) {
    console.error("Admin registration error:", error);

    if (error.code === 11000) {
      return res.status(400).json({ error: "Admin with this email already exists" });
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: "Validation failed", details: errors });
    }

    res.status(500).json({ error: "Registration failed" });
  }
});

// Verify setup token
app.get("/api/admin/verify-setup-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const admin = await Admin.findOne({
      passwordSetupToken: token,
      passwordSetupExpires: { $gt: Date.now() },
    });

    if (!admin) {
      return res.status(400).json({
        error: "Invalid or expired setup link",
        message: "Please contact your administrator for a new setup link",
      });
    }

    res.json({
      valid: true,
      email: admin.email,
      name: admin.name,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});

// Set password
app.post("/api/admin/setup-password", authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long",
      });
    }

    const admin = await Admin.findOne({
      passwordSetupToken: token,
      passwordSetupExpires: { $gt: Date.now() },
    });

    if (!admin) {
      return res.status(400).json({
        error: "Invalid or expired setup link",
      });
    }

    // Set new password
    admin.password = await bcrypt.hash(password, 12);
    admin.passwordSetupToken = null;
    admin.passwordSetupExpires = null;
    admin.isPasswordSet = true;

    await admin.save();

    res.json({
      message: "Password set successfully. You can now login.",
      success: true,
    });
  } catch (error) {
    console.error("Password setup error:", error);
    res.status(500).json({ error: "Failed to set password" });
  }
});

// Send password reset email
app.post("/api/admin/send-password-reset", authenticateAdmin, async (req, res) => {
  try {
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({ error: "Admin ID is required" });
    }

    const targetAdmin = await Admin.findById(adminId);
    if (!targetAdmin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Role hierarchy check
    const roleHierarchy = {
      "Super Admin": 4,
      "Admin": 3,
      "Editor": 2,
      "Moderator": 2,
      "User": 1,
    };

    const currentUserLevel = roleHierarchy[req.admin.role] || 0;
    const targetUserLevel = roleHierarchy[targetAdmin.role] || 0;

    // Prevent lower-level users from resetting higher-level users' passwords
    if (currentUserLevel < targetUserLevel) {
      return res.status(403).json({
        error: "Insufficient privileges to reset this user's password",
      });
    }

    // Generate new setup token
    const setupToken = crypto.randomBytes(32).toString('hex');
    
    targetAdmin.passwordSetupToken = setupToken;
    targetAdmin.passwordSetupExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    targetAdmin.isPasswordSet = false;

    await targetAdmin.save();

    // Send setup email
    try {
      await sendAccountSetupEmail(
        targetAdmin.email,
        targetAdmin.name,
        setupToken,
        targetAdmin.role
      );
      
      console.log(`Password reset email sent to ${targetAdmin.email}`);
      
      res.json({
        message: "Password reset email sent successfully",
        email: targetAdmin.email,
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      
      // Rollback the token changes if email fails
      targetAdmin.passwordSetupToken = null;
      targetAdmin.passwordSetupExpires = null;
      await targetAdmin.save();
      
      return res.status(500).json({
        error: "Failed to send password reset email",
        details: emailError.message
      });
    }

  } catch (error) {
    console.error("Password reset error:", error);
    
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid admin ID" });
    }
    
    res.status(500).json({ error: "Failed to send password reset email" });
  }
});

app.post("/api/admin/panel-login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientInfo = getClientInfo(req);

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const admin = await Admin.findOne({
      email: email.toLowerCase(),
      isActive: true,
    });

    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (admin.isLocked) {
      return res.status(423).json({
        error:
          "Account temporarily locked due to too many failed login attempts",
        lockUntil: admin.lockUntil,
      });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      await admin.incLoginAttempts();
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // UPDATED: Block only "User" role from admin panel
    const allowedRoles = ["Super Admin", "Admin", "Moderator", "Editor"];
    if (!allowedRoles.includes(admin.role)) {
      return res.status(403).json({
        error: "Access denied: Admin privileges required",
        message: "User accounts cannot access the admin panel"
      });
    }

    // Reset login attempts and continue with token generation
    await admin.resetLoginAttempts();
    const sessionId = crypto.randomUUID();
    await admin.addSession(
      sessionId,
      clientInfo.userAgent,
      clientInfo.ipAddress
    );

    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        sessionId: sessionId,
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
        department: admin.department,
      },
    });
  } catch (error) {
    console.error("Admin panel login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Admin login
app.post("/api/admin/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const clientInfo = getClientInfo(req);

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const admin = await Admin.findOne({
      email: email.toLowerCase(),
      isActive: true,
    });

    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({
        error:
          "Account temporarily locked due to too many failed login attempts",
        lockUntil: admin.lockUntil,
      });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);

    if (!isValidPassword) {
      await admin.incLoginAttempts();
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Reset login attempts on successful login
    await admin.resetLoginAttempts();

    // Generate session ID and add to admin's sessions
    const sessionId = crypto.randomUUID();
    await admin.addSession(
      sessionId,
      clientInfo.userAgent,
      clientInfo.ipAddress
    );

    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        sessionId: sessionId,
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
        department: admin.department,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Admin logout
app.post("/api/admin/logout", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
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
      isActive: true,
    });

    if (!admin) {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (decoded.sessionId) {
      const hasValidSession = admin.sessionIds.some(
        (session) => session.sessionId === decoded.sessionId
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
        department: admin.department,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});
// PROTECTED ADMIN ROUTES (require JWT token authentication)

// Edit admin
app.put("/api/admin/edit", authenticateAdmin, async (req, res) => {
  try {
    const {
      id,
      email,
      password,
      name,
      avatar,
      role,
      isActive,
      department,
      phone,
      permissions,
    } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Admin ID is required" });
    }

    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Role hierarchy protection
    const roleHierarchy = {
      "Super Admin": 4,
      Admin: 3,
      Editor: 2,
      Moderator: 2,
      User: 1,
    };

    const currentUserLevel = roleHierarchy[req.admin.role] || 0;
    const targetUserLevel = roleHierarchy[admin.role] || 0;
    const newRoleLevel = role ? roleHierarchy[role] || 0 : targetUserLevel;

    // Allow users to edit their own profile
    const isEditingSelf = admin._id.toString() === req.admin._id.toString();

    if (!isEditingSelf) {
      // Prevent lower-level users from editing higher-level users
      if (currentUserLevel < targetUserLevel) {
        return res.status(403).json({
          error: "Insufficient privileges to edit this user",
        });
      }

      // Prevent promoting users to a level higher than yourself
      if (newRoleLevel > currentUserLevel) {
        return res.status(403).json({
          error: "Cannot assign a role higher than your own privilege level",
        });
      }

      // Prevent same-level editing unless Super Admin
      if (
        currentUserLevel === targetUserLevel &&
        req.admin.role !== "Super Admin"
      ) {
        return res.status(403).json({
          error: "Cannot edit users at your privilege level",
        });
      }
    } else {
      // Prevent demoting yourself from Super Admin
      if (req.admin.role === "Super Admin" && role && role !== "Super Admin") {
        return res.status(403).json({
          error:
            "Cannot demote yourself from Super Admin. Another Super Admin must do this.",
        });
      }
    }

    const allowedSelfFields = ['name', 'avatar', 'department', 'phone', 'permissions'];
    const allowedAdminFields = [...allowedSelfFields, 'role', 'isActive', 'email'];
    const fieldsToUse = isEditingSelf ? allowedSelfFields : allowedAdminFields;

    // Only update whitelisted fields
    for (const field of fieldsToUse) {
      if (req.body[field] !== undefined) {
        admin[field] = req.body[field];
      }
    }

    // Hash new password if provided
    if (password) {
      admin.password = await bcrypt.hash(password, 12);
    }

    await admin.save();

    res.json({
      message: "Admin updated successfully",
      admin: admin.toJSON(),
    });
  } catch (error) {

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res
        .status(400)
        .json({ error: "Validation failed", details: errors });
    }

    res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/api/admin/delete", authenticateAdmin, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const admin = await Admin.findByEmail(email);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Prevent self-deletion
    if (admin.email === req.decoded.email) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    // Role hierarchy - define role levels
    const roleHierarchy = {
      "Super Admin": 4,
      Admin: 3,
      Editor: 2,
      Moderator: 2,
      User: 1,
    };

    const currentUserLevel = roleHierarchy[req.admin.role] || 0;
    const targetUserLevel = roleHierarchy[admin.role] || 0;

    // Prevent lower-level users from deleting higher-level users
    if (currentUserLevel < targetUserLevel) {
      return res.status(403).json({
        error: "Insufficient privileges to delete this user",
        message: `Only Super Admins can delete ${admin.role} accounts`,
      });
    }

    // Prevent same-level deletion unless Super Admin
    if (
      currentUserLevel === targetUserLevel &&
      req.admin.role !== "Super Admin"
    ) {
      return res.status(403).json({
        error: "Cannot delete users at your privilege level",
      });
    }

    // Get admin info before deletion
    const adminResponse = admin.toJSON();

    // Delete the admin
    await Admin.deleteOne({ email: email.toLowerCase() });

    res.json({
      message: "Admin deleted successfully",
      deletedAdmin: adminResponse,
    });
  } catch (error) {
    res.status(500).json({ error: "Deletion failed" });
  }
});


app.get("/api/admin/list", authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive, search } = req.query;

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    
    // SECURE VERSION: Sanitize search input
    if (search) {
      // Remove MongoDB operators and escape regex
      const sanitizedSearch = String(search)
        .replace(/[${}]/g, '')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .substring(0, 100);
        
      filter.$or = [
        { name: { $regex: sanitizedSearch, $options: "i" } },
        { email: { $regex: sanitizedSearch, $options: "i" } },
        { department: { $regex: sanitizedSearch, $options: "i" } },
      ];
    }

    // Validate and sanitize pagination
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 10));

    const admins = await Admin.find(filter)
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .skip((safePage - 1) * safeLimit)
      .select('-password -sessionIds') // Don't return sensitive fields
      .exec();

    const total = await Admin.countDocuments(filter);

    res.json({
      admins,
      total,
      page: safePage,
      pages: Math.ceil(total / safeLimit),
    });
  } catch (error) {

    res.status(500).json({ error: "Failed to fetch admins" });
  }
});

// Get admin statistics
app.get("/api/admin/stats", authenticateAdmin, async (req, res) => {
  try {
    const stats = await Admin.getStats();
    const roleStats = await Admin.countByRole();

    res.json({
      ...stats,
      roleBreakdown: roleStats,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Check if user can access a specific tool
app.post("/api/auth/check-tool-access", authenticateAdmin, async (req, res) => {
  try {
    const { tool } = req.body;
    const userRole = req.admin.role;

    // Define which tools require authentication
    const protectedTools = [
      "escalation-email",
      "offline-mods-note-email-generator",
      "business-listing-update",
      "qr-generator",
      "osad-and-site-launch",
      "obcx-email-creator",
      "embed-code-generator",
      "admin-panel",
    ];

    // Define role-based tool access
    const toolAccess = {
      "admin-panel": ["Super Admin", "Admin", "Moderator"],
      "escalation-email": ["Super Admin", "Admin", "Moderator", "User"],
      "business-listing-update": ["Super Admin", "Admin", "Moderator", "User"],
      "offline-mods-note-email-generator": [
        "Super Admin",
        "Admin",
        "Moderator",
        "User",
      ],
      "qr-generator": ["Super Admin", "Admin", "Moderator", "User"],
      "osad-and-site-launch": ["Super Admin", "Admin", "Moderator", "User"],
      "obcx-email-creator": ["Super Admin", "Admin", "Moderator", "User"],
      "embed-code-generator": ["Super Admin", "Admin", "Moderator", "User"],
      article: ["Super Admin", "Admin", "Moderator", "User"],
      "knowledge-base": ["Super Admin", "Admin", "Moderator", "User"],
    };

    const hasAccess =
      !protectedTools.includes(tool) ||
      (toolAccess[tool] && toolAccess[tool].includes(userRole));

    res.json({
      hasAccess,
      userRole,
      userName: req.admin.name,
      redirectUrl: hasAccess ? null : "/auth.html",
    });
  } catch (error) {


    res.status(500).json({ error: "Access check failed" });
  }
});

// Public route to check if a tool requires authentication (no token needed)
app.get("/api/auth/tool-info/:toolName", (req, res) => {
  const { toolName } = req.params;

  const toolInfo = {
    "escalation-email": {
      name: "Escalation Email Tool",
      description: "Create escalation emails",
      requiresAuth: true,
    },
    "offline-mods-note-email-generator": {
      name: "Offline Mods Note & Email Generator",
      description: "Create concise offline mods note and emails",
      requiresAuth: true,
    },
    "business-listing-update": {
      name: "Business Listing Tool",
      description: "Update business listings",
      requiresAuth: true,
    },
    "qr-generator": {
      name: "QR Code Generator",
      description: "Generate QR codes",
      requiresAuth: false,
    },
    "osad-and-site-launch": {
      name: "OSAD & Site Launch Email and Note Generator",
      description: "Generate T3 Notes and Email at once",
      requiresAuth: true,
    },
    "obcx-email-creator": {
      name: "OBCX Email Generator",
      description: "Generate OBCX Callback Emails",
      requiresAuth: true,
    },
    "embed-code-generator": {
      name: "Embed Code Generator",
      description: "Create escalation emails",
      requiresAuth: true,
    },
    article: {
      name: "Article - Forbidden Knowledge In One Place",
      description: "Grimoire of power",
      requiresAuth: true,
    },
    "knowledge-base": {
      name: "Knowledge Repository",
      description: "Read all the Grimoire To Gain Power",
      requiresAuth: true,
    },
  };

  const info = toolInfo[toolName] || {
    name: "Tool",
    description: "WorkToolsHub Tool",
    requiresAuth: true,
  };

  res.json(info);
});

// OTHER ROUTES

// Sitemap and robots
app.get("/sitemap.xml", (req, res) => {
  res.redirect(301, "/api/sitemap.xml");
});

app.get("/robots.txt", (req, res) => {
  res.redirect(301, "/api/robots.txt");
});




// Health check endpoint
app.get("/api/health", async (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";

  let adminCount = 0;
  if (mongoose.connection.readyState === 1) {
    try {
      adminCount = await Admin.countDocuments();
    } catch (error) {
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
      adminSystem: `${adminCount} admin(s) registered`,
    },
  });
});

// API documentation endpoint
app.get("/api/docs", (req, res) => {
  res.json({
    title: "WorkToolsHub API",
    version: "2.0.0",
    endpoints: {
      auth: {
        "POST /api/auth/verify-email": "Verify user email authorization",
      },
      admin: {
        "POST /api/admin/register":
          "Register new admin (requires JWT_SECRET header)",
        "POST /api/admin/login": "Admin login",
        "POST /api/admin/logout": "Admin logout",
        "POST /api/admin/verify": "Verify admin token",
        "PUT /api/admin/edit": "Edit admin (requires JWT token)",
        "DELETE /api/admin/delete": "Delete admin (requires JWT token)",
        "GET /api/admin/list": "List all admins (requires JWT token)",
        "GET /api/admin/stats": "Get admin statistics (requires JWT token)",
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
        "GET /api/test-db": "Database connection test",
      },
    },
  });
});

// Edit suggestions routes
app.get("/api/admin/suggestions", authenticateAdmin, async (req, res) => {
  try {
    const suggestions = await EditSuggestion.find().sort({ createdAt: -1 });
    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ error: "Failed to load suggestions" });
  }
});

app.put("/api/admin/suggestions/:id", authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const suggestion = await EditSuggestion.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!suggestion) {
      return res.status(404).json({ error: "Suggestion not found" });
    }

    res.json({ suggestion });
  } catch (error) {

    res.status(500).json({ error: "Failed to update suggestion" });
  }
});

// Homepage
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
// 404 handler for API routes
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
  } catch (error) {
    console.error("❌ Scheduled cleanup failed:", error);
  }
}, 24 * 60 * 60 * 1000);

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
        console.log(
          "💡 To register your first admin, use: POST /api/admin/register with X-JWT-Secret header"
        );
      }
    } catch (error) {
      console.warn("⚠️  Could not check admin count:", error.message);
    }
  }

   setInterval(() => {
     fetch("https://worktoolshubv2.onrender.com")
       .then(() => console.log("Pinged self to stay awake 🟢"))
       .catch((err) => console.error("Ping failed:", err));
   }, 30 * 1000);


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
