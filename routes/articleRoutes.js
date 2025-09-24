// routes/articleRoutes.js - Refactored to remove marked
const express = require('express');
const mongoose = require('mongoose');
const Article = require('../models/articleModel');
const EditSuggestion = require('../models/editSuggestions');
const AIService = require('../services/AIService');

const router = express.Router();

// Helper function to check database connection
const checkDBConnection = () => {
  return mongoose.connection.readyState === 1;
};

// Demo articles fallback
const getDemoArticles = () => [
  {
    _id: 'demo-1',
    title: "Getting Started with React",
    excerpt: "Learn the basics of React development with this comprehensive guide.",
    content: "This is a demo article about React basics...",
    category: "tutorials",
    difficulty: "beginner",
    tags: ["React", "JavaScript", "Frontend"],
    author: "Demo Author",
    date: new Date().toISOString(),
    views: 150,
    readTime: "5 min read",
    upvotes: 10,
    helpfulCount: 25,
    published: true
  },
  {
    _id: 'demo-2',
    title: "Advanced Node.js Patterns",
    excerpt: "Explore advanced patterns and best practices for Node.js development.",
    content: "This is a demo article about advanced Node.js patterns...",
    category: "technical",
    difficulty: "advanced",
    tags: ["Node.js", "Backend", "JavaScript"],
    author: "Demo Expert",
    date: new Date().toISOString(),
    views: 300,
    readTime: "10 min read",
    upvotes: 25,
    helpfulCount: 45,
    published: true
  }
];

// GET all articles
router.get('/articles', async (req, res) => {
  try {
    console.log('📥 Incoming request: GET /articles');
    console.log('🔎 Query params:', req.query);

    if (Article && Article.find) {
      const articles = await Article.find({});
      console.log(`✅ Retrieved ${articles.length} articles from MongoDB`);
      return res.json(articles); // send raw content
    } else {
      console.warn('⚠️ Article model not available — falling back to demo data');
    }

    const demoArticles = [
      { id: 1, title: 'Demo Article', content: 'MongoDB not connected' },
    ];
    res.json(demoArticles);

  } catch (error) {
    console.error('❌ Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles', details: error.message });
  }
});

// GET single article
router.get('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!checkDBConnection()) {
      const demoArticles = getDemoArticles();
      const demoArticle = demoArticles.find(a => a._id === id);
      if (demoArticle) return res.json(demoArticle);
      return res.status(404).json({ error: 'Article not found' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid article ID format' });
    }

    const article = await Article.findById(id).maxTimeMS(5000);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    article.views += 1;
    await article.save();

    res.json(article); // raw content

  } catch (error) {
    console.error('Error fetching article:', error);
    if (error.name === 'CastError') return res.status(400).json({ error: 'Invalid article ID' });
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// POST new article
router.post('/', async (req, res) => {
  try {
    const { title, excerpt, content, category, difficulty, tags, author } = req.body;

    const newArticle = new Article({
      title,
      excerpt,
      content,
      category,
      difficulty,
      tags,
      author,
      date: new Date(),
      views: 0,
      readTime: "5 min read",
      upvotes: 0,
      helpfulCount: 0
    });

    await newArticle.save();
    res.status(201).json(newArticle); // raw content

  } catch (err) {
    console.error('Error creating article:', err);
    res.status(500).json({ error: 'Failed to create article' });
  }
});

// POST /articles/:id/upvote
router.post('/articles/:id/upvote', async (req, res) => {
  try {
    const { upvote } = req.body;
    const userId = req.user?.id || req.ip;
    const { id } = req.params;

    if (!checkDBConnection()) {
      return res.json({ upvotes: 0, userUpvoted: false });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid article ID format' });
    }

    const article = await Article.findById(id).maxTimeMS(5000);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const hasUpvoted = article.upvotedBy.includes(userId);

    if (upvote && !hasUpvoted) {
      article.upvotes += 1;
      article.upvotedBy.push(userId);
    } else if (!upvote && hasUpvoted) {
      article.upvotes = Math.max(0, article.upvotes - 1);
      article.upvotedBy = article.upvotedBy.filter(uid => uid !== userId);
    }

    await article.save();
    res.json({ 
      upvotes: article.upvotes, 
      userUpvoted: article.upvotedBy.includes(userId) 
    });

  } catch (error) {
    console.error('Error updating upvote:', error);
    res.status(500).json({ error: 'Failed to update upvote' });
  }
});

// POST /articles/:id/helpful
router.post('/articles/:id/helpful', async (req, res) => {
  try {
    const { id } = req.params;

    if (!checkDBConnection()) {
      return res.json({ helpfulCount: 1 });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid article ID format' });
    }

    const article = await Article.findByIdAndUpdate(
      id,
      { $inc: { helpfulCount: 1 } },
      { new: true }
    ).maxTimeMS(5000);

    if (!article) return res.status(404).json({ error: 'Article not found' });

    res.json({ helpfulCount: article.helpfulCount });

  } catch (error) {
    console.error('Error updating helpful count:', error);
    res.status(500).json({ error: 'Failed to update helpful count' });
  }
});

// POST /ai-query
router.post('/ai-query', async (req, res) => {
  const { query, context } = req.body;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const relevantContext = AIService.createKnowledgeBaseContext(context || [], query);

    const systemPrompt = `You are a helpful technical assistant for WorkToolsHub. 
Your role is to help users find solutions and information based on our knowledge base.

Available articles context: ${JSON.stringify(relevantContext)}

Guidelines:
- Answer based on the knowledge base context when possible
- If the exact answer isn't available, provide helpful general guidance
- Be concise but thorough
- Suggest specific articles from the knowledge base when relevant
- If you can't help with the specific query, suggest they browse related categories or contact support
- Always be professional and helpful`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: query }
    ];

    const answer = await AIService.query(messages);

    const relatedArticles = (context || [])
      .filter(article => {
        const searchText = `${article.title} ${article.excerpt} ${article.tags?.join(' ') || ''}`.toLowerCase();
        const queryWords = query.toLowerCase().split(' ');
        return queryWords.some(word => word.length > 2 && searchText.includes(word));
      })
      .slice(0, 3);

    res.json({
      answer,
      relatedArticles: relatedArticles.map(article => ({
        id: article.id,
        title: article.title,
        category: article.category
      }))
    });

  } catch (error) {
    console.error("AI query error:", error);

    res.json({
      answer: "The AI assistant is temporarily unavailable. Please try browsing our knowledge base categories or use the search function to find relevant articles. If you need further assistance, please contact our support team.",
      relatedArticles: []
    });
  }
});

module.exports = router;
