const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  excerpt: { type: String, required: true },
  content: { type: String, required: true },
  category: [{
    type: String,
    required: true,
    enum: ['technical', 'tutorials', 'troubleshooting', 'best-practices', 'tools', 'guide']
  }],
  difficulty: {
    type: String,
    required: true,
    enum: ['beginner', 'intermediate', 'advanced', 'expert']
  },
  tags: [{ type: String, index: true }],
  author: { type: String, required: true },
  date: { type: Date, default: Date.now, index: true },
  views: { type: Number, default: 0 },
  readTime: String,
  published: { type: Boolean, default: true },
  slug: { type: String, unique: true },

  // 👇 Add these for frontend compatibility
  upvotes: { type: Number, default: 0 },
  helpfulCount: { type: Number, default: 0 },
  upvotedBy: [{ type: String }]
});

// Text search index
articleSchema.index({
  title: 'text',
  excerpt: 'text',
  content: 'text',
  tags: 'text'
});

module.exports = mongoose.model('Article', articleSchema);
