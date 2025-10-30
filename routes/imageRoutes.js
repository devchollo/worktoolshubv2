// routes/imageRoutes.js
const express = require('express');
const router = express.Router();
const { Validator } = require('../utils/validation');

class ImageGenerationService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = 'imagen-4.0-generate-preview-06-06';
    this.baseUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:predict`;
  }

  sanitizePrompt(prompt) {
    if (!prompt) return '';
    let cleaned = String(prompt).trim();
    cleaned = cleaned.replace(/ignore previous instructions/gi, '[filtered]');
    cleaned = cleaned.replace(/system:|assistant:|user:/gi, '[filtered]');
    return cleaned.substring(0, 480);
  }

  enhancePrompt(prompt, style) {
    const styleEnhancements = {
      photorealistic: 'photorealistic, high detail, professional photography, sharp focus',
      artistic: 'artistic style, creative composition, vibrant colors, expressive',
      minimalist: 'minimalist design, clean lines, simple, modern, elegant',
      abstract: 'abstract art, geometric shapes, creative patterns, contemporary'
    };
    return `${prompt}, ${styleEnhancements[style] || styleEnhancements.photorealistic}`;
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

    console.log(`🎨 Generating ${numImages} image(s) with Imagen...`);
    console.log(`📝 Prompt: ${enhancedPrompt.substring(0, 100)}...`);

    try {
      const requestBody = {
        instances: [{
          prompt: enhancedPrompt
        }],
        parameters: {
          sampleCount: Math.min(numImages, 4),
          aspectRatio: aspectRatio,
          safetySetting: "block_low_and_above",
          personGeneration: "allow_adult"
        }
      };

      console.log('📤 Sending request...');

      const response = await fetch(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );

      const responseText = await response.text();
      console.log(`📥 Status: ${response.status}`);

      if (!response.ok) {
        console.error('❌ Error:', responseText.substring(0, 300));
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { message: responseText };
        }
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      }

      const data = JSON.parse(responseText);
      console.log('✅ Response received');

      const images = [];
      
      if (data.predictions && Array.isArray(data.predictions)) {
        for (const prediction of data.predictions) {
          const imageData = prediction.bytesBase64Encoded || 
                          prediction.image || 
                          prediction.generatedImage;
          
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
        console.error('❌ No images found in response');
        throw new Error('No images generated');
      }

      console.log(`✅ Generated ${images.length} image(s)`);
      return images;

    } catch (error) {
      console.error('❌ Error:', error.message);
      
      if (error.message.includes('quota')) {
        throw new Error('API quota exceeded');
      } else if (error.message.includes('safety')) {
        throw new Error('Content blocked by safety filters');
      } else {
        throw new Error(`Generation failed: ${error.message}`);
      }
    }
  }

  async upscaleImage(imageUrl) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    console.log('🔍 Upscaling image...');

    try {
      let base64Image;
      if (imageUrl.startsWith('data:image')) {
        base64Image = imageUrl.split(',')[1];
      } else {
        throw new Error('Invalid image format');
      }

      const upscaleUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict`;

      const requestBody = {
        instances: [{
          image: {
            bytesBase64Encoded: base64Image
          },
          prompt: "upscale, enhance quality, high resolution"
        }],
        parameters: {
          sampleCount: 1,
          mode: "upscale",
          upscaleFactor: 2,
          safetySetting: "block_low_and_above"
        }
      };

      const response = await fetch(
        `${upscaleUrl}?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );

      const responseText = await response.text();
      console.log(`📥 Upscale status: ${response.status}`);

      if (!response.ok) {
        console.error('❌ Upscale error:', responseText.substring(0, 300));
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { message: responseText };
        }
        throw new Error(errorData.error?.message || `Upscale failed: ${response.status}`);
      }

      const data = JSON.parse(responseText);

      if (data.predictions && data.predictions[0]) {
        const imageData = data.predictions[0].bytesBase64Encoded || 
                        data.predictions[0].image;
        
        if (imageData) {
          console.log('✅ Image upscaled');
          return {
            url: `data:image/png;base64,${imageData}`,
            mimeType: 'image/png'
          };
        }
      }

      throw new Error('No upscaled image in response');

    } catch (error) {
      console.error('❌ Upscale error:', error.message);
      throw new Error(`Upscale failed: ${error.message}`);
    }
  }
}

const imageService = new ImageGenerationService();

router.post('/generate', async (req, res) => {
  try {
    const { prompt, style = 'photorealistic', size = '1024x1024', numImages = 1 } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    const sanitizedPrompt = Validator.sanitizeInput(prompt);

    if (sanitizedPrompt.length < 3 || sanitizedPrompt.length > 480) {
      return res.status(400).json({ error: 'Prompt must be 3-480 characters' });
    }

    const validStyles = ['photorealistic', 'artistic', 'minimalist', 'abstract'];
    if (!validStyles.includes(style)) {
      return res.status(400).json({ error: 'Invalid style' });
    }

    const validSizes = ['1024x1024', '1024x1792', '1792x1024'];
    if (!validSizes.includes(size)) {
      return res.status(400).json({ error: 'Invalid size' });
    }

    const safeNumImages = Math.min(Math.max(parseInt(numImages) || 1, 1), 4);

    const images = await imageService.generateImages(sanitizedPrompt, style, size, safeNumImages);

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

    if (error.message.includes('quota')) {
      return res.status(429).json({ error: 'Rate limit exceeded', message: 'Too many requests' });
    }

    if (error.message.includes('safety')) {
      return res.status(400).json({ error: 'Content blocked', message: 'Try a different prompt' });
    }

    res.status(500).json({ error: 'Generation failed', message: error.message });
  }
});

router.post('/upscale', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Image URL is required'
      });
    }

    if (!imageUrl.startsWith('data:image')) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid image format'
      });
    }

    const upscaledImage = await imageService.upscaleImage(imageUrl);

    res.json({
      success: true,
      upscaledUrl: upscaledImage.url,
      mimeType: upscaledImage.mimeType
    });

  } catch (error) {
    console.error('❌ Upscale endpoint error:', error.message);

    if (error.message.includes('quota')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests'
      });
    }

    res.status(500).json({
      error: 'Upscale failed',
      message: error.message
    });
  }
});

router.get('/health', (req, res) => {
  res.json({
    status: process.env.GEMINI_API_KEY ? 'OK' : 'Misconfigured',
    service: 'AI Image Generation',
    model: 'Imagen 4.0 Preview',
    geminiApi: process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured'
  });
});

module.exports = router;