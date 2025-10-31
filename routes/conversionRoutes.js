// routes/conversionRoutes.js - UPDATED FOR DIRECT DOWNLOADS
const express = require('express');
const multer = require('multer');
const router = express.Router();
const fileConversionService = require('../services/fileConversionService');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'image/bmp', 'image/tiff', 'image/svg+xml', 'image/x-icon',
      // Audio
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac',
      'audio/m4a', 'audio/aac', 'audio/x-m4a', 'audio/opus',
      // Video
      'video/mp4', 'video/avi', 'video/quicktime', 'video/x-matroska',
      'video/x-flv', 'video/x-ms-wmv', 'video/webm', 'video/mpeg',
      // Documents
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/html', 'text/markdown', 'application/rtf',
      'application/vnd.oasis.opendocument.text'
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

// Check system capabilities
router.get('/capabilities', async (req, res) => {
  try {
    const ffmpegAvailable = await fileConversionService.checkFFmpegAvailability();
    const libreOfficeAvailable = await fileConversionService.checkLibreOfficeAvailability();

    res.json({
      success: true,
      capabilities: {
        images: true,
        audio: ffmpegAvailable,
        video: ffmpegAvailable,
        documents: {
          basic: true,
          advanced: libreOfficeAvailable
        }
      },
      message: !ffmpegAvailable ? 
        'FFmpeg not available - audio/video conversions disabled' : 
        'All conversion features available'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check capabilities',
      message: error.message
    });
  }
});

// Convert single file - RETURNS FILE DIRECTLY
router.post('/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a file to convert'
      });
    }

    const { targetFormat, quality, width, height, fit, bitrate, sampleRate, videoBitrate, audioBitrate, resolution, fps } = req.body;

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

    // Build conversion options based on file type
    const fileType = fileConversionService.detectFileType(sourceFormat);
    const options = {};

    // Image options
    if (fileType === 'image') {
      options.quality = parseInt(quality) || 90;
      if (width || height) {
        options.resize = {
          width: width ? parseInt(width) : null,
          height: height ? parseInt(height) : null,
          fit: fit || 'inside'
        };
      }
    }

    // Audio options
    if (fileType === 'audio') {
      options.bitrate = bitrate || '192k';
      options.sampleRate = sampleRate ? parseInt(sampleRate) : 44100;
      options.channels = 2;
    }

    // Video options
    if (fileType === 'video') {
      options.videoBitrate = videoBitrate || '1000k';
      options.audioBitrate = audioBitrate || '128k';
      if (resolution) options.resolution = resolution;
      if (fps) options.fps = parseInt(fps);
    }

    // Convert the file
    const converted = await fileConversionService.convert(
      req.file.buffer,
      sourceFormat,
      targetFormat,
      options
    );

    // Generate output filename
    const outputFilename = req.file.originalname.replace(/\.[^/.]+$/, `.${targetFormat}`);

    // Set headers for file download
    res.setHeader('Content-Type', getMimeType(targetFormat));
    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
    res.setHeader('Content-Length', converted.size);
    res.setHeader('X-Original-Size', req.file.size);
    res.setHeader('X-Converted-Size', converted.size);
    res.setHeader('X-Compression-Ratio', ((1 - converted.size / req.file.size) * 100).toFixed(2));
    
    // Send the converted file buffer
    res.send(converted.buffer);

  } catch (error) {
    console.error('File conversion error:', error);
    
    if (error.message.includes('Unsupported') || error.message.includes('not supported')) {
      return res.status(400).json({
        error: 'Invalid conversion',
        message: error.message
      });
    }
    
    if (error.message.includes('FFmpeg') || error.message.includes('LibreOffice')) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Conversion failed',
      message: error.message || 'Failed to convert file'
    });
  }
});

// Convert single file with preview - RETURNS JSON WITH BASE64
router.post('/convert-preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a file to convert'
      });
    }

    const { targetFormat, quality, width, height, fit, bitrate, sampleRate, videoBitrate, audioBitrate, resolution, fps } = req.body;

    if (!targetFormat) {
      return res.status(400).json({
        error: 'Target format is required',
        message: 'Please specify the target format'
      });
    }

    const sourceFormat = req.file.originalname.split('.').pop().toLowerCase();

    if (!fileConversionService.isConversionSupported(sourceFormat, targetFormat)) {
      return res.status(400).json({
        error: 'Conversion not supported',
        message: `Cannot convert from ${sourceFormat} to ${targetFormat}`
      });
    }

    const fileType = fileConversionService.detectFileType(sourceFormat);
    const options = {};

    if (fileType === 'image') {
      options.quality = parseInt(quality) || 90;
      if (width || height) {
        options.resize = {
          width: width ? parseInt(width) : null,
          height: height ? parseInt(height) : null,
          fit: fit || 'inside'
        };
      }
    }

    if (fileType === 'audio') {
      options.bitrate = bitrate || '192k';
      options.sampleRate = sampleRate ? parseInt(sampleRate) : 44100;
      options.channels = 2;
    }

    if (fileType === 'video') {
      options.videoBitrate = videoBitrate || '1000k';
      options.audioBitrate = audioBitrate || '128k';
      if (resolution) options.resolution = resolution;
      if (fps) options.fps = parseInt(fps);
    }

    const converted = await fileConversionService.convert(
      req.file.buffer,
      sourceFormat,
      targetFormat,
      options
    );

    const outputFilename = req.file.originalname.replace(/\.[^/.]+$/, `.${targetFormat}`);

    // Return JSON with base64 encoded file
    res.json({
      success: true,
      originalFile: {
        name: req.file.originalname,
        format: sourceFormat,
        size: req.file.size,
        type: fileType
      },
      convertedFile: {
        name: outputFilename,
        format: targetFormat,
        size: converted.size,
        type: fileType,
        data: converted.buffer.toString('base64'),
        mimeType: getMimeType(targetFormat)
      },
      metadata: converted.metadata,
      compressionRatio: ((1 - converted.size / req.file.size) * 100).toFixed(2)
    });

  } catch (error) {
    console.error('File conversion error:', error);
    
    if (error.message.includes('Unsupported') || error.message.includes('not supported')) {
      return res.status(400).json({
        error: 'Invalid conversion',
        message: error.message
      });
    }
    
    if (error.message.includes('FFmpeg') || error.message.includes('LibreOffice')) {
      return res.status(503).json({
        error: 'Service unavailable',
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

    const { targetFormat, quality, width, height, fit, bitrate, sampleRate } = req.body;

    if (!targetFormat) {
      return res.status(400).json({
        error: 'Target format is required',
        message: 'Please specify the target format'
      });
    }

    const results = [];

    for (const file of req.files) {
      try {
        const sourceFormat = file.originalname.split('.').pop().toLowerCase();

        if (!fileConversionService.isConversionSupported(sourceFormat, targetFormat)) {
          results.push({
            success: false,
            originalName: file.originalname,
            error: `Conversion from ${sourceFormat} to ${targetFormat} not supported`
          });
          continue;
        }

        const fileType = fileConversionService.detectFileType(sourceFormat);
        const options = {};

        if (fileType === 'image') {
          options.quality = parseInt(quality) || 90;
          if (width || height) {
            options.resize = {
              width: width ? parseInt(width) : null,
              height: height ? parseInt(height) : null,
              fit: fit || 'inside'
            };
          }
        }

        if (fileType === 'audio') {
          options.bitrate = bitrate || '192k';
          options.sampleRate = sampleRate ? parseInt(sampleRate) : 44100;
        }

        const converted = await fileConversionService.convert(
          file.buffer,
          sourceFormat,
          targetFormat,
          options
        );

        const outputFilename = file.originalname.replace(/\.[^/.]+$/, `.${targetFormat}`);

        results.push({
          success: true,
          originalFile: {
            name: file.originalname,
            format: sourceFormat,
            size: file.size
          },
          convertedFile: {
            name: outputFilename,
            format: targetFormat,
            size: converted.size,
            data: converted.buffer.toString('base64')
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

    const outputFilename = `optimized_${req.file.originalname}`;

    // Set headers for file download
    res.setHeader('Content-Type', getMimeType(format));
    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);
    res.setHeader('Content-Length', optimized.optimizedSize);
    res.setHeader('X-Original-Size', optimized.originalSize);
    res.setHeader('X-Optimized-Size', optimized.optimizedSize);
    res.setHeader('X-Compression-Ratio', optimized.compressionRatio);
    
    // Send the optimized file buffer
    res.send(optimized.buffer);

  } catch (error) {
    console.error('Image optimization error:', error);
    res.status(500).json({
      error: 'Optimization failed',
      message: error.message || 'Failed to optimize image'
    });
  }
});

// Helper function to get MIME type from format
function getMimeType(format) {
  const mimeTypes = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'ico': 'image/x-icon',
    'avif': 'image/avif',
    'svg': 'image/svg+xml',
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
    'm4a': 'audio/m4a',
    'aac': 'audio/aac',
    'opus': 'audio/opus',
    // Video
    'mp4': 'video/mp4',
    'avi': 'video/avi',
    'mov': 'video/quicktime',
    'mkv': 'video/x-matroska',
    'webm': 'video/webm',
    'flv': 'video/x-flv',
    'wmv': 'video/x-ms-wmv',
    'mpeg': 'video/mpeg',
    // Documents
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'txt': 'text/plain',
    'html': 'text/html',
    'md': 'text/markdown',
    'rtf': 'application/rtf'
  };

  return mimeTypes[format.toLowerCase()] || 'application/octet-stream';
}

module.exports = router;