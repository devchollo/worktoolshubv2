// Add this to your routes/emailRoutes.js or create a new uploadRoutes.js
const multer = require('multer');
const fileUploadService = require('../services/fileUploadService');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg',
      'video/mp4', 'video/webm', 'video/avi', 'video/quicktime',
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'
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