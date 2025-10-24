// routes/metaRoutes.js
const express = require('express');
const router = express.Router();
const { Validator, ValidationError } = require('../utils/validation');

class MetaService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = "https://api.openai.com/v1/chat/completions";
    this.defaultModel = "gpt-3.5-turbo";
    this.defaultTemperature = 0.3;
  }

  sanitizeForPrompt(text) {
    if (!text) return '';
    
    let cleaned = String(text).trim();
    
    // Remove potential prompt injection patterns
    cleaned = cleaned.replace(/ignore previous instructions/gi, '[filtered]');
    cleaned = cleaned.replace(/system:|assistant:|user:/gi, '[filtered]');
    cleaned = cleaned.replace(/<\|.*?\|>/g, '[filtered]');
    
    // Limit length
    cleaned = cleaned.substring(0, 2000);
    
    return cleaned;
  }

  async generateMetaDescription(pageDescription, keywords, pageTitle) {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const safeDescription = this.sanitizeForPrompt(pageDescription);
    const safeKeywords = this.sanitizeForPrompt(keywords);
    const safeTitle = this.sanitizeForPrompt(pageTitle);

    const prompt = `
Create an SEO-optimized meta description based on the following information:

Page Title: ${safeTitle}
Target Keywords: ${safeKeywords}
Page Content Summary: ${safeDescription}

Requirements:
1. Length: 150-160 characters (STRICT - very important for SEO)
2. Include the primary keyword naturally
3. Make it compelling and action-oriented
4. Accurately describe the page content
5. End with a call-to-action if appropriate
6. Avoid keyword stuffing
7. Make it unique and engaging

Please write ONLY the meta description text, nothing else. Do not include any explanations, quotation marks, or additional text.
    `;

    const systemMessage = `You are an expert SEO copywriter specializing in creating compelling meta descriptions that improve click-through rates. You understand search engine optimization best practices and know how to balance keyword optimization with natural, engaging copy. Always stay within the 150-160 character limit.`;

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [
            {
              role: "system",
              content: systemMessage,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: 100,
          temperature: this.defaultTemperature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenAI API error: ${response.status} - ${
            errorData.error?.message || "Unknown error"
          }`
        );
      }

      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response format from OpenAI API");
      }

      let description = data.choices[0].message.content.trim();
      
      // Remove any quotes that might have been added
      description = description.replace(/^["']|["']$/g, '');
      
      // Ensure it's within character limit
      if (description.length > 160) {
        description = description.substring(0, 157) + '...';
      }

      return description;
    } catch (error) {
      console.error("OpenAI API call failed:", error);
      throw error;
    }
  }
}

const metaService = new MetaService();

// POST /api/meta/generate-description - Generate AI-powered meta description
router.post('/generate-description', async (req, res) => {
  try {
    const { pageDescription, keywords, pageTitle } = req.body;

    // Validate required fields
    if (!pageDescription || !pageDescription.trim()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Page description is required'
      });
    }

    if (!keywords || !keywords.trim()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Target keywords are required'
      });
    }

    // Sanitize inputs
    const sanitizedData = Validator.sanitizeData({
      pageDescription,
      keywords,
      pageTitle: pageTitle || ''
    });

    // Validate input lengths
    if (sanitizedData.pageDescription.length > 2000) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Page description is too long (max 2000 characters)'
      });
    }

    if (sanitizedData.keywords.length > 500) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Keywords list is too long (max 500 characters)'
      });
    }

    console.log('🤖 Generating meta description with AI...');

    // Generate description using AI
    const description = await metaService.generateMetaDescription(
      sanitizedData.pageDescription,
      sanitizedData.keywords,
      sanitizedData.pageTitle
    );

    console.log(`✅ Generated meta description: ${description.length} characters`);

    res.json({
      success: true,
      description: description,
      characterCount: description.length,
      isOptimal: description.length >= 150 && description.length <= 160
    });

  } catch (error) {
    console.error('Meta description generation error:', error);

    if (error.message.includes('OpenAI API error')) {
      return res.status(502).json({
        error: 'AI service unavailable',
        message: 'The AI service is temporarily unavailable. Please try again later.'
      });
    }

    if (error.message.includes('API key')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Meta description generation service is not configured.'
      });
    }

    res.status(500).json({
      error: 'Generation failed',
      message: 'Failed to generate meta description. Please try again.'
    });
  }
});

// POST /api/meta/validate - Validate meta tags
router.post('/validate', async (req, res) => {
  try {
    const { pageTitle, metaDescription, keywords, imageUrl } = req.body;
    
    const validation = {
      isValid: true,
      warnings: [],
      errors: [],
      suggestions: []
    };

    // Validate title
    if (pageTitle) {
      const titleLength = pageTitle.length;
      
      if (titleLength < 30) {
        validation.warnings.push('Title is too short (minimum 30 characters recommended)');
        validation.isValid = false;
      } else if (titleLength > 60) {
        validation.warnings.push('Title is too long (60 characters recommended for optimal display)');
      }

      if (!keywords || !keywords.split(',').some(keyword => 
        pageTitle.toLowerCase().includes(keyword.trim().toLowerCase())
      )) {
        validation.suggestions.push('Consider including your primary keyword in the title');
      }
    } else {
      validation.errors.push('Page title is required');
      validation.isValid = false;
    }

    // Validate meta description
    if (metaDescription) {
      const descLength = metaDescription.length;
      
      if (descLength < 120) {
        validation.warnings.push('Meta description is too short (minimum 120 characters recommended)');
      } else if (descLength > 160) {
        validation.errors.push('Meta description exceeds 160 characters and will be truncated');
        validation.isValid = false;
      }

      if (keywords) {
        const keywordList = keywords.split(',').map(k => k.trim().toLowerCase());
        const hasKeyword = keywordList.some(keyword => 
          metaDescription.toLowerCase().includes(keyword)
        );
        
        if (!hasKeyword) {
          validation.suggestions.push('Include at least one target keyword in the meta description');
        }
      }
    } else {
      validation.errors.push('Meta description is required');
      validation.isValid = false;
    }

    // Validate image URL
    if (imageUrl) {
      try {
        new URL(imageUrl);
        
        // Check if it's HTTPS
        if (!imageUrl.startsWith('https://')) {
          validation.warnings.push('Image URL should use HTTPS for better security');
        }
      } catch (error) {
        validation.errors.push('Invalid image URL format');
        validation.isValid = false;
      }
    } else {
      validation.suggestions.push('Adding an image improves social media sharing appearance');
    }

    // Validate keywords
    if (keywords) {
      const keywordCount = keywords.split(',').length;
      
      if (keywordCount < 3) {
        validation.suggestions.push('Consider adding more target keywords (3-5 recommended)');
      } else if (keywordCount > 10) {
        validation.warnings.push('Too many keywords may dilute SEO focus (5-7 recommended)');
      }
    }

    res.json({
      success: true,
      validation
    });

  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: 'An error occurred during validation'
    });
  }
});

// GET /api/meta/best-practices - Get SEO best practices
router.get('/best-practices', (req, res) => {
  res.json({
    success: true,
    bestPractices: {
      title: {
        minLength: 30,
        maxLength: 60,
        optimal: '50-60 characters',
        tips: [
          'Include primary keyword near the beginning',
          'Make it unique for each page',
          'Include brand name if appropriate',
          'Write for humans, not just search engines',
          'Avoid keyword stuffing'
        ]
      },
      metaDescription: {
        minLength: 120,
        maxLength: 160,
        optimal: '150-160 characters',
        tips: [
          'Include primary and secondary keywords naturally',
          'Write compelling copy that encourages clicks',
          'Include a call-to-action',
          'Accurately describe page content',
          'Make it unique for each page'
        ]
      },
      openGraph: {
        imageSize: '1200x630px',
        imageFormat: 'JPG or PNG',
        tips: [
          'Use high-quality images',
          'Ensure text is readable in thumbnail size',
          'Keep file size under 1MB',
          'Use consistent branding',
          'Test with Facebook Sharing Debugger'
        ]
      },
      twitter: {
        imageSize: '1200x600px',
        imageFormat: 'JPG or PNG',
        tips: [
          'Use summary_large_image card type for best visibility',
          'Ensure images look good in both mobile and desktop',
          'Test with Twitter Card Validator',
          'Keep descriptions concise',
          'Use engaging visuals'
        ]
      },
      general: [
        'Use unique meta tags for every page',
        'Keep important keywords at the beginning',
        'Avoid duplicate content across pages',
        'Update meta tags when page content changes',
        'Monitor performance in Google Search Console',
        'Test social media previews before publishing',
        'Use structured data when appropriate'
      ]
    }
  });
});

// GET /api/meta/health - Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Meta Tag Generator API',
    timestamp: new Date().toISOString(),
    aiService: process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'
  });
});

module.exports = router;