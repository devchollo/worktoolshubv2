// routes/imageRoutes.js
const express = require('express');
const router = express.Router();
const { Validator } = require('../utils/validation');

class ImageGenerationService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImages';
  }

  sanitizePrompt(prompt) {
    if (!prompt) return '';
    
    let cleaned = String(prompt).trim();
    
    // Remove potential prompt injection patterns
    cleaned = cleaned.replace(/ignore previous instructions/gi, '[filtered]');
    cleaned = cleaned.replace(/system:|assistant:|user:/gi, '[filtered]');
    
    // Limit length
    cleaned = cleaned.substring(0, 2000);
    
    return cleaned;
  }

  enhancePrompt(prompt, style) {
    const styleEnhancements = {
      photorealistic: 'photorealistic, high detail, professional photography, 8k resolution',
      artistic: 'artistic style, creative composition, vibrant colors, expressive',
      minimalist: 'minimalist design, clean lines, simple composition, modern',
      abstract: 'abstract art, geometric shapes, creative patterns, artistic expression'
    };

    const enhancement = styleEnhancements[style] || styleEnhancements.photorealistic;
    return `${prompt}, ${enhancement}`;
  }

  parseSizeToNumbers(size) {
    const [width, height] = size.split('x').map(Number);
    return { width, height };
  }

  async generateImages(prompt, style = 'photorealistic', size = '1024x1024', numImages = 1) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const safePrompt = this.sanitizePrompt(prompt);
    const enhancedPrompt = this.enhancePrompt(safePrompt, style);
    const { width, height } = this.parseSizeToNumbers(size);

    console.log(`🎨 Generating ${numImages} image(s) with Gemini...`);
    console.log(`📝 Prompt: ${enhancedPrompt.substring(0, 100)}...`);

    try {
      const response = await fetch(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: enhancedPrompt,
            number_of_images: Math.min(numImages, 4),
            aspect_ratio: this.getAspectRatio(width, height),
            safety_filter_level: 'block_some',
            person_generation: 'allow_adult',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Gemini API error:', errorData);
        throw new Error(
          errorData.error?.message || `Image generation failed: ${response.status}`
        );
      }

      const data = await response.json();
      console.log('✅ Images generated successfully');

      if (!data.generatedImages || data.generatedImages.length === 0) {
        throw new Error('No images were generated');
      }

      // Extract base64 images and convert to URLs
      const images = data.generatedImages.map((img, index) => ({
        url: `data:image/png;base64,${img.generatedImage}`,
        mimeType: 'image/png',
        index: index
      }));

      return images;

    } catch (error) {
      console.error('❌ Image generation error:', error);
      throw error;
    }
  }

  getAspectRatio(width, height) {
    // Gemini supports specific aspect ratios
    const ratio = width / height;
    
    if (ratio === 1) return '1:1'; // Square
    if (ratio > 1.5) return '16:9'; // Landscape
    if (ratio > 1) return '4:3'; // Wide
    if (ratio < 0.7) return '9:16'; // Portrait
    if (ratio < 1) return '3:4'; // Tall
    
    return '1:1'; // Default to square
  }
}

const imageService = new ImageGenerationService();

// POST /api/images/generate - Generate images with AI
router.post('/generate', async (req, res) => {
  try {
    const { prompt, style = 'photorealistic', size = '1024x1024', numImages = 1 } = req.body;

    // Validate prompt
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Prompt is required'
      });
    }

    // Sanitize inputs
    const sanitizedPrompt = Validator.sanitizeInput(prompt);

    // Validate prompt length
    if (sanitizedPrompt.length < 3) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Prompt must be at least 3 characters long'
      });
    }

    if (sanitizedPrompt.length > 2000) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Prompt is too long (max 2000 characters)'
      });
    }

    // Validate style
    const validStyles = ['photorealistic', 'artistic', 'minimalist', 'abstract'];
    if (!validStyles.includes(style)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid style selected'
      });
    }

    // Validate size
    const validSizes = ['1024x1024', '1024x1792', '1792x1024'];
    if (!validSizes.includes(size)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid size selected'
      });
    }

    // Validate number of images
    const safeNumImages = Math.min(Math.max(parseInt(numImages) || 1, 1), 4);

    console.log(`📸 Image generation request: ${safeNumImages} image(s), ${style} style, ${size}`);

    // Generate images
    const images = await imageService.generateImages(
      sanitizedPrompt,
      style,
      size,
      safeNumImages
    );

    res.json({
      success: true,
      images: images,
      prompt: sanitizedPrompt,
      style: style,
      size: size,
      count: images.length
    });

  } catch (error) {
    console.error('Image generation endpoint error:', error);

    if (error.message.includes('API key')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Image generation service is not configured'
      });
    }

    if (error.message.includes('quota') || error.message.includes('limit')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.'
      });
    }

    if (error.message.includes('safety') || error.message.includes('policy')) {
      return res.status(400).json({
        error: 'Content policy violation',
        message: 'Your prompt was blocked by our content policy. Please try a different prompt.'
      });
    }

    res.status(500).json({
      error: 'Generation failed',
      message: 'Failed to generate images. Please try again.'
    });
  }
});

// POST /api/images/upscale - Upscale an existing image (placeholder)
router.post('/upscale', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        error: 'Image URL is required'
      });
    }

    // TODO: Implement actual upscaling logic
    // For now, return a message that it's coming soon
    res.status(501).json({
      error: 'Not implemented',
      message: 'Image upscaling feature is coming soon!'
    });

  } catch (error) {
    console.error('Upscale error:', error);
    res.status(500).json({
      error: 'Upscaling failed'
    });
  }
});

// GET /api/images/health - Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'AI Image Generation',
    timestamp: new Date().toISOString(),
    geminiApi: process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured',
    supportedStyles: ['photorealistic', 'artistic', 'minimalist', 'abstract'],
    supportedSizes: ['1024x1024', '1024x1792', '1792x1024'],
    maxImages: 4
  });
});

module.exports = router;