// services/AIService.js
class AIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = "https://api.openai.com/v1/chat/completions";
    this.defaultModel = "gpt-3.5-turbo";
    this.defaultTemperature = 0.3;
  }

  async query(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    try {
      // Using native fetch (Node 18+)
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: options.model || this.defaultModel,
          temperature: options.temperature || this.defaultTemperature,
          max_tokens: options.maxTokens || 500,
          messages
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0]) {
        throw new Error('Invalid response from OpenAI API');
      }

      return data.choices[0].message.content;
    } catch (err) {
      console.error("AIService error:", err);
      throw err;
    }
  }

  // Helper method to create knowledge base context
  createKnowledgeBaseContext(articles, query) {
    // Filter relevant articles based on query keywords
    const queryWords = query.toLowerCase().split(' ');
    const relevantArticles = articles.filter(article => {
      const searchText = `${article.title} ${article.excerpt} ${article.tags.join(' ')}`.toLowerCase();
      return queryWords.some(word => searchText.includes(word));
    }).slice(0, 5); // Limit to top 5 relevant articles

    return relevantArticles.map(article => ({
      title: article.title,
      excerpt: article.excerpt,
      category: article.category,
      tags: article.tags
    }));
  }
}

module.exports = new AIService();