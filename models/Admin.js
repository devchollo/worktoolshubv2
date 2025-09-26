// models/Admin.js
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: [true, 'Email is required'],
    unique: true, 
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  avatar: { 
    type: String,
    default: function() {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=6366f1&color=fff`;
    }
  },
  role: { 
    type: String, 
    default: "Administrator",
    enum: {
      values: ["Administrator", "Super Admin", "Moderator", "Editor"],
      message: '{VALUE} is not a valid role'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0,
    max: [10, 'Too many login attempts']
  },
  lockUntil: {
    type: Date
  },
  // Additional fields for better admin management
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete', 'admin', 'super_admin']
  }],
  department: {
    type: String,
    trim: true,
    maxlength: [30, 'Department cannot be more than 30 characters']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en',
      maxlength: [5, 'Language code too long']
    },
    notifications: {
      email: { type: Boolean, default: true },
      browser: { type: Boolean, default: true },
      mobile: { type: Boolean, default: false }
    }
  },
  // Security and audit fields
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false // Don't include in queries by default
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },
  sessionIds: [{
    sessionId: String,
    createdAt: { type: Date, default: Date.now },
    userAgent: String,
    ipAddress: String
  }]
}, {
  timestamps: true,
  toJSON: { 
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.twoFactorSecret;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.twoFactorSecret;
      delete ret.resetPasswordToken;
      delete ret.resetPasswordExpires;
      return ret;
    }
  }
});

// Indexes for better performance
adminSchema.index({ email: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ role: 1 });
adminSchema.index({ createdAt: -1 });
adminSchema.index({ lastLogin: -1 });

// Virtual for checking if account is locked
adminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Virtual for full name display
adminSchema.virtual('displayName').get(function() {
  return this.name;
});

// Virtual for avatar URL with fallback
adminSchema.virtual('avatarUrl').get(function() {
  return this.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=6366f1&color=fff`;
});

// Pre-save middleware
adminSchema.pre('save', function(next) {
  // Generate avatar if not provided
  if (!this.avatar && this.name) {
    this.avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=6366f1&color=fff`;
  }
  
  // Set default permissions based on role
  if (this.isModified('role') && (!this.permissions || this.permissions.length === 0)) {
    switch (this.role) {
      case 'Super Admin':
        this.permissions = ['read', 'write', 'delete', 'admin', 'super_admin'];
        break;
      case 'Administrator':
        this.permissions = ['read', 'write', 'delete', 'admin'];
        break;
      case 'Moderator':
        this.permissions = ['read', 'write', 'delete'];
        break;
      case 'Editor':
        this.permissions = ['read', 'write'];
        break;
      default:
        this.permissions = ['read'];
    }
  }
  
  next();
});

// Instance methods

// Method to increment login attempts
adminSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
adminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: Date.now() }
  });
};

// Method to check permissions
adminSchema.methods.hasPermission = function(permission) {
  return this.permissions && this.permissions.includes(permission);
};

// Method to add session
// adminSchema.methods.addSession = function(sessionId, userAgent, ipAddress) {
//   // Keep only last 10 sessions
//   if (this.sessionIds.length >= 10) {
//     this.sessionIds = this.sessionIds.slice(-9);
//   }
  
//   this.sessionIds.push({
//     sessionId,
//     userAgent,
//     ipAddress,
//     createdAt: new Date()
//   });
  
//   return this.save();
// };

adminSchema.methods.addSession = function(sessionId, userAgent, ipAddress) {
  return this.constructor.updateOne(
    { _id: this._id },
    {
      $push: {
        sessionIds: {
          $each: [{
            sessionId,
            userAgent,
            ipAddress,
            createdAt: new Date()
          }],
          $slice: -10 // keep last 10 only
        }
      }
    }
  );
};


// Method to remove session
// adminSchema.methods.removeSession = function(sessionId) {
//   this.sessionIds = this.sessionIds.filter(session => session.sessionId !== sessionId);
//   return this.save();
// };

adminSchema.methods.removeSession = function(sessionId) {
  return this.constructor.updateOne(
    { _id: this._id },
    { $pull: { sessionIds: { sessionId } } }
  );
};

// Method to generate password reset token
adminSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Static methods

// Find admin by email (case insensitive)
adminSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Find active admins
adminSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Find admins by role
adminSchema.statics.findByRole = function(role) {
  return this.find({ role });
};

// Get admin statistics
adminSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: ['$isActive', 1, 0] } },
        locked: { 
          $sum: { 
            $cond: [
              { $gt: ['$lockUntil', new Date()] }, 
              1, 
              0 
            ] 
          } 
        },
        recentLogins: {
          $sum: {
            $cond: [
              { $gte: ['$lastLogin', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
  
  return stats[0] || { total: 0, active: 0, locked: 0, recentLogins: 0 };
};

// Count by role
adminSchema.statics.countByRole = function() {
  return this.aggregate([
    { $group: { _id: '$role', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

// Clean up expired sessions
adminSchema.statics.cleanupExpiredSessions = function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  return this.updateMany(
    {},
    {
      $pull: {
        sessionIds: {
          createdAt: { $lt: thirtyDaysAgo }
        }
      }
    }
  );
};

module.exports = mongoose.model('Admin', adminSchema);