const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  avatarUrl: {
    type: String,
    default: null
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  userAgent: String,
  ipAddress: String
}, {
  timestamps: true
});

// Index for faster queries
testimonialSchema.index({ isApproved: 1, createdAt: -1 });
testimonialSchema.index({ isFeatured: 1, rating: -1 });

// Virtual for placeholder avatar
testimonialSchema.virtual('displayAvatar').get(function() {
  if (this.avatarUrl) {
    return this.avatarUrl;
  }
  // Generate UI Avatars placeholder
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=6366f1&color=fff&size=200`;
});

// Static method to get approved testimonials
testimonialSchema.statics.getApproved = function(limit = 10) {
  return this.find({ isApproved: true })
    .sort({ isFeatured: -1, rating: -1, createdAt: -1 })
    .limit(limit);
};

// Static method to get featured testimonials
testimonialSchema.statics.getFeatured = function() {
  return this.find({ isApproved: true, isFeatured: true })
    .sort({ rating: -1, createdAt: -1 });
};

// Static method to get average rating
testimonialSchema.statics.getAverageRating = async function() {
  const result = await this.aggregate([
    { $match: { isApproved: true } },
    { $group: {
      _id: null,
      avgRating: { $avg: '$rating' },
      totalCount: { $sum: 1 }
    }}
  ]);
  
  return result[0] || { avgRating: 0, totalCount: 0 };
};

module.exports = mongoose.model('Testimonial', testimonialSchema);