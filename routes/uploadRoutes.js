const express = require('express');
const multer = require('multer');
const fileUploadService = require('../services/fileUploadService');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
  const allowedTypes = [
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg',
    // Video
    'video/mp4', 'video/webm', 'video/avi', 'video/quicktime',
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
}
});

// File upload endpoint
router.post('/upload/embed-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    const result = await fileUploadService.uploadFile(req.file, req.file.originalname);
    
    res.json({
      success: true,
      publicUrl: result.publicUrl,
      fileName: result.fileName,
      size: result.size,
      fileId: result.fileId
    });

  } catch (error) {
    console.error('File upload endpoint error:', error);
    
    if (error.message.includes('Unsupported file type')) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only audio, video, and image files are supported'
      });
    }
    
    res.status(500).json({
      error: 'Upload failed', 
      message: 'Failed to upload file. Please try again.'
    });
  }
});


// General file upload endpoint with 100MB limit
router.post('/upload/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    // Additional validation for file types
    const allowedTypes = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg',
      // Video
      'video/mp4', 'video/webm', 'video/avi', 'video/quicktime'
    ];

    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only PDF, DOCX, images, audio, and video files are allowed'
      });
    }

    const result = await fileUploadService.uploadFile(req.file, req.file.originalname);
    
    res.json({
      success: true,
      publicUrl: result.publicUrl,
      fileName: result.fileName,
      size: result.size,
      fileId: result.fileId,
      fileType: req.file.mimetype
    });

  } catch (error) {
    console.error('File upload endpoint error:', error);
    
    if (error.message.includes('Unsupported file type')) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'Only PDF, DOCX, images, audio, and video files are supported'
      });
    }
    
    res.status(500).json({
      error: 'Upload failed', 
      message: 'Failed to upload file. Please try again.'
    });
  }
});


module.exports = router;