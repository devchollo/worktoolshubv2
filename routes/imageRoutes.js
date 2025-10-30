// routes/imageRoutes.js - Stable Diffusion Implementation
const express = require('express');
const router = express.Router();
const { Validator } = require('../utils/validation');

class ImageGenerationService {
  constructor() {
    // Use Replicate API for Stable Diffusion (more reliable and publicly available)
    this.replicateToken = process.env.REPLICATE_API_TOKEN;
    this.baseUrl = 'https://api.replicate.com/v1/predictions';
    
    // Stable Diffusion XL model
    this.model = 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';
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
      photorealistic: 'photorealistic, high detail, professional photography, 8k resolution, sharp focus, studio lighting',
      artistic: 'artistic style, creative composition, vibrant colors, expressive, beautiful artwork, trending on artstation',
      minimalist: 'minimalist design, clean lines, simple composition, modern, elegant, white background',
      abstract: 'abstract art, geometric shapes, creative patterns, artistic expression, contemporary art'
    };

    const enhancement = styleEnhancements[style] || styleEnhancements.photorealistic;
    
    // Add negative prompt elements
    const negativePrompt = 'ugly, blurry, low quality, distorted, deformed, watermark, text, signature';
    
    return {
      prompt: `${prompt}, ${enhancement}`,
      negativePrompt: negativePrompt
    };
  }

  getSizeParams(size) {
    const sizeMap = {
      '1024x1024': { width: 1024, height: 1024 },
      '1024x1792': { width: 1024, height: 1792 },
      '1792x1024': { width: 1792, height: 1024 }
    };
    return sizeMap[size] || sizeMap['1024x1024'];
  }

  async generateImages(prompt, style = 'photorealistic', size = '1024x1024', numImages = 1) {
    if (!this.replicateToken) {
      throw new Error('Replicate API token not configured');
    }

    const safePrompt = this.sanitizePrompt(prompt);
    const { prompt: enhancedPrompt, negativePrompt } = this.enhancePrompt(safePrompt, style);
    const { width, height } = this.getSizeParams(size);

    console.log(`🎨 Generating ${numImages} image(s) with Stable Diffusion XL...`);
    console.log(`📝 Prompt: ${enhancedPrompt.substring(0, 100)}...`);
    console.log(`📐 Size: ${width}x${height}`);

    const images = [];

    // Generate images one by one (or use num_outputs parameter)
    for (let i = 0; i < Math.min(numImages, 4); i++) {
      try {
        console.log(`🖼️ Generating image ${i + 1}/${numImages}...`);

        // Create prediction
        const createResponse = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${this.replicateToken}`
          },
          body: JSON.stringify({
            version: this.model,
            input: {
              prompt: enhancedPrompt,
              negative_prompt: negativePrompt,
              width: width,
              height: height,
              num_outputs: 1,
              scheduler: "K_EULER",
              num_inference_steps: 30,
              guidance_scale: 7.5,
              refine: "expert_ensemble_refiner"
            }
          })
        });

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          console.error('❌ Replicate API error:', errorText);
          throw new Error(`Failed to start image generation: ${createResponse.status}`);
        }

        const prediction = await createResponse.json();
        console.log(`⏳ Prediction created: ${prediction.id}`);

        // Poll for completion
        const imageUrl = await this.waitForPrediction(prediction.id);
        
        // Convert URL to base64 for consistent frontend handling
        const base64Image = await this.urlToBase64(imageUrl);

        images.push({
          url: `data:image/png;base64,${base64Image}`,
          originalUrl: imageUrl,
          mimeType: 'image/png',
          index: i
        });

        console.log(`✅ Image ${i + 1} generated successfully`);

      } catch (error) {
        console.error(`❌ Failed to generate image ${i + 1}:`, error.message);
        // Continue with other images even if one fails
      }
    }

    if (images.length === 0) {
      throw new Error('Failed to generate any images');
    }

    console.log(`✅ Successfully generated ${images.length} image(s)`);
    return images;
  }

  async waitForPrediction(predictionId, maxAttempts = 60) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const response = await fetch(`${this.baseUrl}/${predictionId}`, {
        headers: {
          'Authorization': `Token ${this.replicateToken}`
        }
      });

      const prediction = await response.json();
      
      console.log(`📊 Prediction status: ${prediction.status}`);

      if (prediction.status === 'succeeded') {
        // Return the first output URL
        return prediction.output[0];
      }

      if (prediction.status === 'failed' || prediction.status === 'canceled') {
        throw new Error(`Image generation ${prediction.status}: ${prediction.error || 'Unknown error'}`);
      }

      // Status is 'starting' or 'processing', continue polling
    }

    throw new Error('Image generation timeout - took too long');
  }

  async urlToBase64(url) {
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer).toString('base64');
    } catch (error) {
      console.error('❌ Failed to convert URL to base64:', error);
      throw new Error('Failed to process generated image');
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

    console.log('✅ Validation passed, generating images...');

    // Generate images
    const images = await imageService.generateImages(
      sanitizedPrompt,
      style,
      size,
      safeNumImages
    );

    console.log('✅ Sending success response with', images.length, 'images');

    res.json({
      success: true,
      images: images,
      prompt: sanitizedPrompt,
      style: style,
      size: size,
      count: images.length,
      model: 'Stable Diffusion XL'
    });

  } catch (error) {
    console.error('❌ Image generation endpoint error:', error.message);

    if (error.message.includes('token not configured') || error.message.includes('API token')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Image generation service is not configured properly. Please contact administrator.'
      });
    }

    if (error.message.includes('timeout')) {
      return res.status(504).json({
        error: 'Request timeout',
        message: 'Image generation took too long. Please try again with a simpler prompt.'
      });
    }

    if (error.message.includes('quota') || error.message.includes('limit') || error.message.includes('billing')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Service limit reached. Please try again later.'
      });
    }

    if (error.message.includes('safety') || error.message.includes('blocked') || error.message.includes('NSFW')) {
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

    // TODO: Implement actual upscaling logic using Replicate's upscaling models
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
  const isConfigured = !!process.env.REPLICATE_API_TOKEN;
  
  res.json({
    status: isConfigured ? 'OK' : 'Misconfigured',
    service: 'AI Image Generation',
    model: 'Stable Diffusion XL',
    provider: 'Replicate',
    timestamp: new Date().toISOString(),
    apiToken: isConfigured ? 'Configured' : 'Not configured',
    supportedStyles: ['photorealistic', 'artistic', 'minimalist', 'abstract'],
    supportedSizes: ['1024x1024', '1024x1792', '1792x1024'],
    maxImages: 4,
    note: 'Using Stable Diffusion XL via Replicate API'
  });
});

module.exports = router;