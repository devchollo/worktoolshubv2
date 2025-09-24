const express = require('express');
const Article = require('../models/Articles');
const EditSuggestion = require('../models/EditSuggestion');
const AIService = require('../services/AIService');

const router = express.Router();

// GET /api/knowledge-base/articles
router.get('/articles', async (req, res) => {
  try {
    const { search, category, difficulty, date, page = 1, limit = 20 } = req.query;
    let query = {};

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

    if (upvote) {
      if (!article.upvotedBy.includes(userId)) {
        article.upvotes += 1;
        article.upvotedBy.push(userId);
      }
    } else {
      article.upvotes = Math.max(0, article.upvotes - 1);
      article.upvotedBy = article.upvotedBy.filter(id => id !== userId);
    }

    await article.save();
    res.json({ upvotes: article.upvotes });
  } catch (error) {
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
    res.status(500).json({ error: error.message });
  }
});

// POST /api/knowledge-base/ai-query
router.post('/ai-query', async (req, res) => {
  const { query, context } = req.body;
  try {
    const messages = [
      {
        role: "system",
        content: "You are a helpful technical assistant. Answer based on the knowledge base context provided. If the answer isn't in the context, provide helpful general guidance and suggest they contact support."
      },
      {
        role: "user",
        content: `Context: ${JSON.stringify(context)}\n\nQuestion: ${query}`
      }
    ];

    const answer = await AIService.query(messages);

    res.json({
      answer,
      relatedArticles: [] // You can implement matching later
    });
  } catch (error) {
    console.error("AI query error:", error);
    res.status(500).json({ error: 'AI service temporarily unavailable' });
  }
});

module.exports = router;
