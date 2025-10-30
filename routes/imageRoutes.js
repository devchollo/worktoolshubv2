// routes/imageRoutes.js
const express = require('express');
const router = express.Router();
const { Validator } = require('../utils/validation');

class ImageGenerationService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    // Correct Gemini Imagen 3 endpoint
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict';
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

  getAspectRatio(size) {
    // Map sizes to Gemini's aspect ratio format
    const ratioMap = {
      '1024x1024': '1:1',
      '1024x1792': '9:16',
      '1792x1024': '16:9'
    };
    return ratioMap[size] || '1:1';
  }

  async generateImages(prompt, style = 'photorealistic', size = '1024x1024', numImages = 1) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const safePrompt = this.sanitizePrompt(prompt);
    const enhancedPrompt = this.enhancePrompt(safePrompt, style);
    const aspectRatio = this.getAspectRatio(size);

    console.log(`🎨 Generating ${numImages} image(s) with Gemini Imagen 3...`);
    console.log(`📝 Prompt: ${enhancedPrompt.substring(0, 100)}...`);
    console.log(`📐 Aspect Ratio: ${aspectRatio}`);

    try {
      // Correct API request format for Gemini Imagen 3
      const requestBody = {
        instances: [
          {
            prompt: enhancedPrompt
          }
        ],
        parameters: {
          sampleCount: Math.min(numImages, 4),
          aspectRatio: aspectRatio,
          safetyFilterLevel: 'block_some',
          personGeneration: 'allow_adult'
        }
      };

      console.log('📤 Sending request to Gemini API...');

      const response = await fetch(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      const responseText = await response.text();
      console.log(`📥 API Response Status: ${response.status}`);

      if (!response.ok) {
        console.error('❌ Gemini API Error Response:', responseText);
        
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { message: responseText };
        }

        const errorMessage = errorData.error?.message || 
                           errorData.message || 
                           `API error: ${response.status}`;
        
        throw new Error(errorMessage);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('❌ Failed to parse response:', responseText);
        throw new Error('Invalid response from image generation API');
      }

      console.log('✅ Successfully parsed API response');

      // Extract images from Gemini's response format
      if (!data.predictions || data.predictions.length === 0) {
        console.error('❌ No predictions in response:', data);
        throw new Error('No images were generated');
      }

      const images = data.predictions.map((prediction, index) => {
        // Gemini returns images in bytesBase64Encoded field
        const imageData = prediction.bytesBase64Encoded || 
                         prediction.image || 
                         prediction.generatedImage;
        
        if (!imageData) {
          console.error('❌ No image data in prediction:', prediction);
          throw new Error('Invalid image data received');
        }

        return {
          url: `data:image/png;base64,${imageData}`,
          mimeType: prediction.mimeType || 'image/png',
          index: index
        };
      });

      console.log(`✅ Successfully generated ${images.length} image(s)`);
      return images;

    } catch (error) {
      console.error('❌ Image generation error:', error);
      
      // Provide more specific error messages
      if (error.message.includes('API key')) {
        throw new Error('Invalid or missing API key');
      } else if (error.message.includes('quota')) {
        throw new Error('API quota exceeded. Please try again later.');
      } else if (error.message.includes('safety') || error.message.includes('blocked')) {
        throw new Error('Content blocked by safety filters. Please try a different prompt.');
      } else if (error.message.includes('Invalid response')) {
        throw error;
      } else {
        throw new Error(`Generation failed: ${error.message}`);
      }
    }
  }
}

const imageService = new ImageGenerationService();

// POST /api/images/generate - Generate images with AI
router.post('/generate', async (req, res) => {
  try {
    const { prompt, style = 'photorealistic', size = '1024x1024', numImages = 1 } = req.body;

    console.log('📸 Received image generation request');
    console.log('   Prompt:', prompt?.substring(0, 50) + '...');
    console.log('   Style:', style);
    console.log('   Size:', size);
    console.log('   Count:', numImages);

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
    console.error('❌ Image generation endpoint error:', error);

    if (error.message.includes('API key')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Image generation service is not configured properly'
      });
    }

    if (error.message.includes('quota') || error.message.includes('limit')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.'
      });
    }

    if (error.message.includes('safety') || error.message.includes('blocked')) {
      return res.status(400).json({
        error: 'Content policy violation',
        message: 'Your prompt was blocked by content safety filters. Please try a different prompt.'
      });
    }

    res.status(500).json({
      error: 'Generation failed',
      message: error.message || 'Failed to generate images. Please try again.'
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
  const isConfigured = !!process.env.GEMINI_API_KEY;
  
  res.json({
    status: isConfigured ? 'OK' : 'Misconfigured',
    service: 'AI Image Generation',
    model: 'Gemini Imagen 3',
    timestamp: new Date().toISOString(),
    geminiApi: isConfigured ? 'Configured' : 'Not configured',
    supportedStyles: ['photorealistic', 'artistic', 'minimalist', 'abstract'],
    supportedSizes: ['1024x1024', '1024x1792', '1792x1024'],
    maxImages: 4
  });
});

module.exports = router;