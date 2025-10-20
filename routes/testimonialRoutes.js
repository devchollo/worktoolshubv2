const express = require('express');
const multer = require('multer');
const Testimonial = require('../models/Testimonial');
const fileUploadService = require('../services/fileUploadService');
const validator = require('validator');

const router = express.Router();

// Configure multer for avatar uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
    }
  }
});

// Helper to get client info
const getClientInfo = (req) => ({
  userAgent: req.get('User-Agent') || 'Unknown',
  ipAddress: req.ip || req.connection.remoteAddress || 'Unknown'
});

// GET /api/testimonials - Get approved testimonials
router.get('/', async (req, res) => {
  try {
    const { limit = 10, featured = false } = req.query;
    
    let testimonials;
    if (featured === 'true') {
      testimonials = await Testimonial.getFeatured();
    } else {
      testimonials = await Testimonial.getApproved(parseInt(limit));
    }
    
    const stats = await Testimonial.getAverageRating();
    
    res.json({
      testimonials: testimonials.map(t => ({
        id: t._id,
        name: t.name,
        rating: t.rating,
        message: t.message,
        avatar: t.displayAvatar,
        createdAt: t.createdAt,
        isFeatured: t.isFeatured
      })),
      stats: {
        averageRating: Math.round(stats.avgRating * 10) / 10,
        totalCount: stats.totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

// POST /api/testimonials - Submit a new testimonial
router.post('/', upload.single('avatar'), async (req, res) => {
  try {
    const { name, email, rating, message } = req.body;
    const clientInfo = getClientInfo(req);
    
    // Validation
    if (!name || !email || !rating || !message) {
      return res.status(400).json({ 
        error: 'All fields are required',
        fields: { name, email, rating, message: !!message }
      });
    }
    
    // Sanitize inputs
    const safeName = validator.escape(name.trim());
    const safeEmail = validator.normalizeEmail(email);
    const safeMessage = validator.escape(message.trim());
    
    if (!validator.isEmail(safeEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    if (safeMessage.length > 500) {
      return res.status(400).json({ error: 'Message cannot exceed 500 characters' });
    }
    
    // Handle avatar upload if provided
    let avatarUrl = null;
    if (req.file) {
      try {
        const uploadResult = await fileUploadService.uploadFile(
          req.file, 
          `avatar_${Date.now()}_${req.file.originalname}`
        );
        avatarUrl = uploadResult.publicUrl;
      } catch (uploadError) {
        console.error('Avatar upload failed:', uploadError);
        // Continue without avatar - will use placeholder
      }
    }
    
    // Create testimonial
    const testimonial = new Testimonial({
      name: safeName,
      email: safeEmail,
      rating: ratingNum,
      message: safeMessage,
      avatarUrl: avatarUrl,
      userAgent: clientInfo.userAgent,
      ipAddress: clientInfo.ipAddress,
      isApproved: false // Requires admin approval
    });
    
    await testimonial.save();
    
    res.status(201).json({
      success: true,
      message: 'Thank you for your testimonial! It will be reviewed and published soon.',
      testimonial: {
        id: testimonial._id,
        name: testimonial.name,
        rating: testimonial.rating
      }
    });
    
  } catch (error) {
    console.error('Error submitting testimonial:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    
    res.status(500).json({ error: 'Failed to submit testimonial' });
  }
});

// ADMIN ROUTES (require authentication)
const authenticateAdmin = async (req, res, next) => {
  try {
    const jwt = require('jsonwebtoken');
    const Admin = require('../models/Admin');
    
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const admin = await Admin.findOne({ email: decoded.email, isActive: true });
    
    if (!admin) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// GET /api/testimonials/admin/pending - Get pending testimonials
router.get('/admin/pending', authenticateAdmin, async (req, res) => {
  try {
    const pending = await Testimonial.find({ isApproved: false })
      .sort({ createdAt: -1 });
    
    res.json({ testimonials: pending });
  } catch (error) {
    console.error('Error fetching pending testimonials:', error);
    res.status(500).json({ error: 'Failed to fetch pending testimonials' });
  }
});

// PATCH /api/testimonials/admin/:id/approve - Approve testimonial
router.patch('/admin/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;
    
    const testimonial = await Testimonial.findByIdAndUpdate(
      id,
      { 
        isApproved: true,
        isFeatured: featured === true
      },
      { new: true }
    );
    
    if (!testimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Testimonial approved',
      testimonial 
    });
  } catch (error) {
    console.error('Error approving testimonial:', error);
    res.status(500).json({ error: 'Failed to approve testimonial' });
  }
});

// DELETE /api/testimonials/admin/:id - Delete testimonial
router.delete('/admin/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const testimonial = await Testimonial.findByIdAndDelete(id);
    
    if (!testimonial) {
      return res.status(404).json({ error: 'Testimonial not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Testimonial deleted' 
    });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({ error: 'Failed to delete testimonial' });
  }
});

module.exports = router;