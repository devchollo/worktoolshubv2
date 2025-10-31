// routes/altTextRoutes.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const altTextService = require('../services/altTextService');
const fileUploadService = require('../services/fileUploadService');

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

// Generate alt text from uploaded image
router.post('/generate-from-upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image uploaded',
        message: 'Please upload an image file'
      });
    }

    // Upload to Backblaze first
    const uploadResult = await fileUploadService.uploadFile(
      req.file,
      req.file.originalname
    );

    // Generate alt text
    const options = {
      context: req.body.context || '',
      tone: req.body.tone || 'descriptive',
      maxLength: parseInt(req.body.maxLength) || 125,
      includeDetails: req.body.includeDetails !== 'false'
    };

    const altText = await altTextService.generateAltText(
      uploadResult.publicUrl,
      options
    );

    res.json({
      success: true,
      altText,
      imageUrl: uploadResult.publicUrl,
      fileName: uploadResult.fileName,
      fileSize: uploadResult.size
    });

  } catch (error) {
    console.error('Alt text generation error:', error);
    
    if (error.message.includes('Unsupported file type')) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only JPG, PNG, WEBP, and GIF images are supported'
      });
    }
    
    res.status(500).json({
      error: 'Generation failed',
      message: error.message || 'Failed to generate alt text'
    });
  }
});

// Generate alt text from URL
router.post('/generate-from-url', async (req, res) => {
  try {
    const { imageUrl, context, tone, maxLength, includeDetails } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        error: 'Image URL is required',
        message: 'Please provide a valid image URL'
      });
    }

    // Validate URL
    if (!altTextService.isValidImageUrl(imageUrl)) {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'Please provide a valid HTTP/HTTPS image URL'
      });
    }

    const options = {
      context: context || '',
      tone: tone || 'descriptive',
      maxLength: parseInt(maxLength) || 125,
      includeDetails: includeDetails !== 'false'
    };

    const altText = await altTextService.generateAltText(imageUrl, options);

    res.json({
      success: true,
      altText,
      imageUrl
    });

  } catch (error) {
    console.error('Alt text generation from URL error:', error);
    res.status(500).json({
      error: 'Generation failed',
      message: error.message || 'Failed to generate alt text'
    });
  }
});

// Batch generate alt text from multiple uploads
router.post('/generate-batch', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No images uploaded',
        message: 'Please upload at least one image'
      });
    }

    const options = {
      context: req.body.context || '',
      tone: req.body.tone || 'descriptive',
      maxLength: parseInt(req.body.maxLength) || 125,
      includeDetails: req.body.includeDetails !== 'false'
    };

    const results = [];

    for (const file of req.files) {
      try {
        // Upload to Backblaze
        const uploadResult = await fileUploadService.uploadFile(
          file,
          file.originalname
        );

        // Generate alt text
        const altText = await altTextService.generateAltText(
          uploadResult.publicUrl,
          options
        );

        results.push({
          success: true,
          fileName: file.originalname,
          imageUrl: uploadResult.publicUrl,
          altText,
          fileSize: uploadResult.size
        });
      } catch (error) {
        results.push({
          success: false,
          fileName: file.originalname,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      results,
      total: req.files.length,
      successful: results.filter(r => r.success).length
    });

  } catch (error) {
    console.error('Batch alt text generation error:', error);
    res.status(500).json({
      error: 'Batch generation failed',
      message: error.message || 'Failed to process batch images'
    });
  }
});

module.exports = router;