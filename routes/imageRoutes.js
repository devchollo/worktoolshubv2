// routes/imageRoutes.js
const express = require('express');
const router = express.Router();
const { Validator } = require('../utils/validation');

class ImageGenerationService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = 'imagen-3.0-generate-001';
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:predict`;
  }

  sanitizePrompt(prompt) {
    if (!prompt) return '';
    
    let cleaned = String(prompt).trim();
    cleaned = cleaned.replace(/ignore previous instructions/gi, '[filtered]');
    cleaned = cleaned.replace(/system:|assistant:|user:/gi, '[filtered]');
    cleaned = cleaned.substring(0, 2000);
    
    return cleaned;
  }

  enhancePrompt(prompt, style) {
    const styleEnhancements = {
      photorealistic: 'photorealistic, high detail, professional photography, 8k resolution, sharp focus',
      artistic: 'artistic style, creative composition, vibrant colors, expressive, beautiful artwork',
      minimalist: 'minimalist design, clean lines, simple composition, modern, elegant',
      abstract: 'abstract art, geometric shapes, creative patterns, artistic expression, contemporary'
    };

    const enhancement = styleEnhancements[style] || styleEnhancements.photorealistic;
    return `${prompt}, ${enhancement}`;
  }

  getAspectRatio(size) {
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
      // Correct request body for Imagen 3
      const requestBody = {
        instances: [
          {
            prompt: enhancedPrompt
          }
        ],
        parameters: {
          sampleCount: Math.min(numImages, 4),
          aspectRatio: aspectRatio,
          negativePrompt: "blurry, low quality, distorted",
          safetySetting: "block_some",
          personGeneration: "allow_adult"
        }
      };

      console.log('📤 Sending request to Gemini Imagen API...');

      const response = await fetch(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );

      const responseText = await response.text();
      console.log(`📥 API Response Status: ${response.status}`);

      if (!response.ok) {
        console.error('❌ API Error:', responseText.substring(0, 500));
        
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
        console.error('❌ Parse error:', responseText.substring(0, 200));
        throw new Error('Invalid response from API');
      }

      console.log('✅ Parsed response');
      console.log('📊 Response structure:', Object.keys(data).join(', '));

      // Parse Imagen 3 response - try multiple possible structures
      const images = [];

      // Try predictions array
      if (data.predictions && Array.isArray(data.predictions)) {
        for (const prediction of data.predictions) {
          const imageData = prediction.bytesBase64Encoded || 
                          prediction.image || 
                          prediction.mimeType?.data;
          
          if (imageData) {
            images.push({
              url: `data:image/png;base64,${imageData}`,
              mimeType: prediction.mimeType?.mimeType || 'image/png',
              index: images.length
            });
          }
        }
      }

      // Try generatedImages array (alternative structure)
      if (images.length === 0 && data.generatedImages && Array.isArray(data.generatedImages)) {
        for (const img of data.generatedImages) {
          const imageData = img.bytesBase64Encoded || 
                          img.generatedImage || 
                          img.image;
          
          if (imageData) {
            images.push({
              url: `data:image/png;base64,${imageData}`,
              mimeType: 'image/png',
              index: images.length
            });
          }
        }
      }

      if (images.length === 0) {
        console.error('❌ No images found. Response:', JSON.stringify(data).substring(0, 300));
        throw new Error('No images were generated by the API');
      }

      console.log(`✅ Successfully generated ${images.length} image(s)`);
      return images;

    } catch (error) {
      console.error('❌ Generation error:', error.message);

      if (error.message.includes('API key')) {
        throw new Error('Invalid or missing API key');
      } else if (error.message.includes('not found') || error.message.includes('not supported')) {
        throw new Error('Imagen model is not available with your API key. You may need to request access or use a different API.');
      } else if (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
        throw new Error('API quota exceeded. Please try again later.');
      } else if (error.message.includes('safety') || error.message.includes('blocked')) {
        throw new Error('Content blocked by safety filters. Please try a different prompt.');
      } else {
        throw new Error(`Generation failed: ${error.message}`);
      }
    }
  }
}

const imageService = new ImageGenerationService();

router.post('/generate', async (req, res) => {
  try {
    const { prompt, style = 'photorealistic', size = '1024x1024', numImages = 1 } = req.body;

    console.log('📸 Image generation request received');

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Prompt is required'
      });
    }

    const sanitizedPrompt = Validator.sanitizeInput(prompt);

    if (sanitizedPrompt.length < 3 || sanitizedPrompt.length > 2000) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Prompt must be between 3 and 2000 characters'
      });
    }

    const validStyles = ['photorealistic', 'artistic', 'minimalist', 'abstract'];
    if (!validStyles.includes(style)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid style'
      });
    }

    const validSizes = ['1024x1024', '1024x1792', '1792x1024'];
    if (!validSizes.includes(size)) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid size'
      });
    }

    const safeNumImages = Math.min(Math.max(parseInt(numImages) || 1, 1), 4);

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
    console.error('❌ Endpoint error:', error.message);

    if (error.message.includes('not available with your API key')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Gemini Imagen API is not available. It may require special access or be in limited beta. Consider using an alternative image generation service.'
      });
    }

    if (error.message.includes('API key')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Image generation service is not configured properly.'
      });
    }

    if (error.message.includes('quota')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.'
      });
    }

    if (error.message.includes('safety') || error.message.includes('blocked')) {
      return res.status(400).json({
        error: 'Content policy violation',
        message: 'Your prompt was blocked. Please try a different prompt.'
      });
    }

    res.status(500).json({
      error: 'Generation failed',
      message: error.message || 'Failed to generate images.'
    });
  }
});

router.post('/upscale', async (req, res) => {
  res.status(501).json({
    error: 'Not implemented',
    message: 'Image upscaling feature is coming soon!'
  });
});

router.get('/health', (req, res) => {
  const isConfigured = !!process.env.GEMINI_API_KEY;
  
  res.json({
    status: isConfigured ? 'OK' : 'Misconfigured',
    service: 'AI Image Generation',
    model: 'Gemini Imagen 3.0',
    timestamp: new Date().toISOString(),
    geminiApi: isConfigured ? 'Configured' : 'Not configured',
    supportedStyles: ['photorealistic', 'artistic', 'minimalist', 'abstract'],
    supportedSizes: ['1024x1024', '1024x1792', '1792x1024'],
    maxImages: 4
  });
});

module.exports = router;