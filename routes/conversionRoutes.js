// routes/conversionRoutes.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const fileConversionService = require('../services/fileConversionService');
const fileUploadService = require('../services/fileUploadService');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/svg+xml'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

// Get supported conversions
router.get('/supported-formats', (req, res) => {
  try {
    const formats = fileConversionService.getSupportedConversions();
    res.json({
      success: true,
      formats
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get supported formats'
    });
  }
});

// Convert single file
router.post('/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a file to convert'
      });
    }

    const { targetFormat, quality, width, height, fit } = req.body;

    if (!targetFormat) {
      return res.status(400).json({
        error: 'Target format is required',
        message: 'Please specify the target format'
      });
    }

    // Get source format
    const sourceFormat = req.file.originalname.split('.').pop().toLowerCase();

    // Check if conversion is supported
    if (!fileConversionService.isConversionSupported(sourceFormat, targetFormat)) {
      return res.status(400).json({
        error: 'Conversion not supported',
        message: `Cannot convert from ${sourceFormat} to ${targetFormat}`
      });
    }

    // Build conversion options
    const options = {
      quality: parseInt(quality) || 90,
      resize: (width || height) ? {
        width: width ? parseInt(width) : null,
        height: height ? parseInt(height) : null,
        fit: fit || 'inside'
      } : null
    };

    // Convert the file
    const converted = await fileConversionService.convertImage(
      req.file.buffer,
      sourceFormat,
      targetFormat,
      options
    );

    // Create a file object for upload
    const convertedFile = {
      buffer: converted.buffer,
      originalname: req.file.originalname.replace(/\.[^/.]+$/, `.${targetFormat}`),
      mimetype: `image/${targetFormat}`,
      size: converted.size
    };

    // Upload converted file to Backblaze
    const uploadResult = await fileUploadService.uploadFile(
      convertedFile,
      convertedFile.originalname
    );

    res.json({
      success: true,
      originalFile: {
        name: req.file.originalname,
        format: sourceFormat,
        size: req.file.size
      },
      convertedFile: {
        name: convertedFile.originalname,
        format: targetFormat,
        size: converted.size,
        url: uploadResult.publicUrl
      },
      metadata: converted.metadata,
      compressionRatio: ((1 - converted.size / req.file.size) * 100).toFixed(2)
    });

  } catch (error) {
    console.error('File conversion error:', error);
    
    if (error.message.includes('Unsupported')) {
      return res.status(400).json({
        error: 'Invalid conversion',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Conversion failed',
      message: error.message || 'Failed to convert file'
    });
  }
});

// Batch convert multiple files
router.post('/convert-batch', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please upload at least one file'
      });
    }

    const { targetFormat, quality, width, height, fit } = req.body;

    if (!targetFormat) {
      return res.status(400).json({
        error: 'Target format is required',
        message: 'Please specify the target format'
      });
    }

    const options = {
      quality: parseInt(quality) || 90,
      resize: (width || height) ? {
        width: width ? parseInt(width) : null,
        height: height ? parseInt(height) : null,
        fit: fit || 'inside'
      } : null
    };

    const results = [];

    for (const file of req.files) {
      try {
        const sourceFormat = file.originalname.split('.').pop().toLowerCase();

        // Check if conversion is supported
        if (!fileConversionService.isConversionSupported(sourceFormat, targetFormat)) {
          results.push({
            success: false,
            originalName: file.originalname,
            error: `Conversion from ${sourceFormat} to ${targetFormat} not supported`
          });
          continue;
        }

        // Convert the file
        const converted = await fileConversionService.convertImage(
          file.buffer,
          sourceFormat,
          targetFormat,
          options
        );

        // Create a file object for upload
        const convertedFile = {
          buffer: converted.buffer,
          originalname: file.originalname.replace(/\.[^/.]+$/, `.${targetFormat}`),
          mimetype: `image/${targetFormat}`,
          size: converted.size
        };

        // Upload to Backblaze
        const uploadResult = await fileUploadService.uploadFile(
          convertedFile,
          convertedFile.originalname
        );

        results.push({
          success: true,
          originalFile: {
            name: file.originalname,
            format: sourceFormat,
            size: file.size
          },
          convertedFile: {
            name: convertedFile.originalname,
            format: targetFormat,
            size: converted.size,
            url: uploadResult.publicUrl
          },
          metadata: converted.metadata,
          compressionRatio: ((1 - converted.size / file.size) * 100).toFixed(2)
        });
      } catch (error) {
        results.push({
          success: false,
          originalName: file.originalname,
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
    console.error('Batch conversion error:', error);
    res.status(500).json({
      error: 'Batch conversion failed',
      message: error.message || 'Failed to process batch files'
    });
  }
});

// Optimize image (compress without format change)
router.post('/optimize', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a file to optimize'
      });
    }

    const format = req.file.originalname.split('.').pop().toLowerCase();
    const quality = parseInt(req.body.quality) || 80;

    const optimized = await fileConversionService.optimizeImage(
      req.file.buffer,
      format,
      { quality }
    );

    // Create a file object for upload
    const optimizedFile = {
      buffer: optimized.buffer,
      originalname: `optimized_${req.file.originalname}`,
      mimetype: req.file.mimetype,
      size: optimized.optimizedSize
    };

    // Upload to Backblaze
    const uploadResult = await fileUploadService.uploadFile(
      optimizedFile,
      optimizedFile.originalname
    );

    res.json({
      success: true,
      originalSize: optimized.originalSize,
      optimizedSize: optimized.optimizedSize,
      compressionRatio: optimized.compressionRatio,
      savedBytes: optimized.originalSize - optimized.optimizedSize,
      url: uploadResult.publicUrl,
      fileName: optimizedFile.originalname
    });

  } catch (error) {
    console.error('Image optimization error:', error);
    res.status(500).json({
      error: 'Optimization failed',
      message: error.message || 'Failed to optimize image'
    });
  }
});

module.exports = router;