const express = require('express');
const Article = require('../models/Article');
const router = express.Router();



// Newfold-core

// GET /api/knowledge-base/articles
app.get('/articles', async (req, res) => {
  try {
    const { search, category, difficulty, date, page = 1, limit = 20 } = req.query;
    
    // Build MongoDB query
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
      .limit(limit)
      .sort({ date: -1 });
    
    res.json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// POST /api/knowledge-base/articles/:id/upvote
app.post('/articles/:id/upvote', async (req, res) => {
  const { upvote } = req.body;
  const userId = req.user?.id || req.ip; // Use IP as fallback
  
  const article = await Article.findById(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  
  // Toggle upvote
  if (upvote) {
    if (!article.upvotedBy.includes(userId)) {
      article.upvotes = (article.upvotes || 0) + 1;
      article.upvotedBy.push(userId);
    }
  } else {
    article.upvotes = Math.max(0, (article.upvotes || 0) - 1);
    article.upvotedBy = article.upvotedBy.filter(id => id !== userId);
  }
  
  await article.save();
  res.json({ upvotes: article.upvotes });
});

// POST /api/knowledge-base/articles/:id/helpful
app.post('/articles/:id/helpful', async (req, res) => {
  const article = await Article.findByIdAndUpdate(
    req.params.id,
    { $inc: { helpfulCount: 1 } },
    { new: true }
  );
  res.json({ helpfulCount: article.helpfulCount });
});



// POST /api/knowledge-base/edit-suggestions
app.post('/edit-suggestions', async (req, res) => {
  const suggestion = new EditSuggestion({
    articleId: req.body.articleId,
    editorName: req.body.editorName,
    editType: req.body.editType,
    suggestion: req.body.suggestion,
    status: 'pending',
    createdAt: new Date()
  });
  
  await suggestion.save();
  
  // Optional: Send notification to admin team
  // await sendEditNotification(suggestion);
  
  res.json({ message: 'Suggestion submitted successfully' });
});




// POST /api/knowledge-base/ai-query  
app.post('/ai-query', async (req, res) => {
  const { query, context } = req.body;
  
  try {
    // Use OpenAI or your preferred AI service
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system", 
          content: `You are a helpful technical assistant. Answer based on the knowledge base context provided. If the answer isn't in the context, provide helpful general guidance and suggest they contact support for specific issues.`
        },
        {
          role: "user", 
          content: `Context: ${JSON.stringify(context)}\n\nQuestion: ${query}`
        }
      ],
      max_tokens: 500
    });
    
    res.json({ 
      answer: response.choices[0].message.content,
      relatedArticles: [] // Could implement similarity search here
    });
  } catch (error) {
    res.status(500).json({ error: 'AI service temporarily unavailable' });
  }
});





module.exports = router;