const express = require('express');
const Article = require('../models/Articles');
const EditSuggestion = require('../models/editSuggestions');
const AIService = require('../services/AIService');

const router = express.Router();

// GET /api/knowledge-base/articles
router.get('/articles', async (req, res) => {
  try {
    const { search, category, difficulty, date, page = 1, limit = 20 } = req.query;
    let query = { published: true };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;

    if (date) {
      const now = new Date();
      let cutoffDate;
      switch (date) {
        case 'week': cutoffDate = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
        case 'month': cutoffDate = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
        case 'quarter': cutoffDate = new Date(now - 90 * 24 * 60 * 60 * 1000); break;
        case 'year': cutoffDate = new Date(now - 365 * 24 * 60 * 60 * 1000); break;
      }
      if (cutoffDate) query.date = { $gte: cutoffDate };
    }

    const articles = await Article.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ date: -1 });

    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/knowledge-base/articles/:id - Get single article
router.get('/articles/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Increment view count
    article.views += 1;
    await article.save();

    res.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/knowledge-base/articles/:id/upvote
router.post('/articles/:id/upvote', async (req, res) => {
  try {
    const { upvote } = req.body;
    const userId = req.user?.id || req.ip;

    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const hasUpvoted = article.upvotedBy.includes(userId);

    if (upvote && !hasUpvoted) {
      article.upvotes += 1;
      article.upvotedBy.push(userId);
    } else if (!upvote && hasUpvoted) {
      article.upvotes = Math.max(0, article.upvotes - 1);
      article.upvotedBy = article.upvotedBy.filter(id => id !== userId);
    }

    await article.save();
    res.json({ 
      upvotes: article.upvotes, 
      userUpvoted: article.upvotedBy.includes(userId) 
    });
  } catch (error) {
    console.error('Error updating upvote:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/knowledge-base/articles/:id/helpful
router.post('/articles/:id/helpful', async (req, res) => {
  try {
    const article = await Article.findByIdAndUpdate(
      req.params.id,
      { $inc: { helpfulCount: 1 } },
      { new: true }
    );
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json({ helpfulCount: article.helpfulCount });
  } catch (error) {
    console.error('Error updating helpful count:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/knowledge-base/edit-suggestions
router.post('/edit-suggestions', async (req, res) => {
  try {
    const suggestion = new EditSuggestion({
      articleId: req.body.articleId,
      editorName: req.body.editorName,
      editType: req.body.editType,
      suggestion: req.body.suggestion,
      status: 'pending'
    });

    await suggestion.save();
    res.json({ message: 'Suggestion submitted successfully' });
  } catch (error) {
    console.error('Error creating edit suggestion:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/knowledge-base/ai-query
router.post('/ai-query', async (req, res) => {
  const { query, context } = req.body;
  
  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // Create relevant context from articles
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
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: query
      }
    ];

    const answer = await AIService.query(messages);

    // Find related articles based on the query
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
    
    // Provide fallback response when AI service fails
    res.json({
      answer: "I'm sorry, the AI assistant is temporarily unavailable. Please try browsing our knowledge base categories or use the search function to find relevant articles. If you need further assistance, please contact our support team.",
      relatedArticles: []
    });
  }
});

// POST /api/knowledge-base/articles (Create new article - for admin use)
router.post('/articles', async (req, res) => {
  try {
    const articleData = req.body;
    
    // Generate slug from title if not provided
    if (!articleData.slug) {
      articleData.slug = articleData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    const article = new Article(articleData);
    await article.save();
    
    res.status(201).json(article);
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;