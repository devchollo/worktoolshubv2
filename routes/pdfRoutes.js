const express = require('express');
const multer = require('multer');
const pdfCombinerService = require('../services/pdfCombinerService');
const router = express.Router();

// Configure multer for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB total limit
    files: 50, // Maximum 50 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error(`File "${file.originalname}" is not a PDF`), false);
    }
  }
});

// PDF combine endpoint
router.post('/pdf/combine', upload.array('pdfs', 50), async (req, res) => {
  try {
    // Validate files
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({
        error: 'Insufficient files',
        message: 'Please upload at least 2 PDF files'
      });
    }

    // Check total size
    const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 100 * 1024 * 1024) {
      return res.status(400).json({
        error: 'File size exceeded',
        message: 'Total file size exceeds 100MB limit'
      });
    }

    // Validate action
    const action = req.body.action || 'download';
    if (!['download', 'url'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action',
        message: 'Action must be either "download" or "url"'
      });
    }

    console.log(`📄 Combining ${req.files.length} PDFs (${(totalSize / 1024 / 1024).toFixed(2)} MB) - Action: ${action}`);

    // Combine PDFs
    const combinedPdf = await pdfCombinerService.combinePDFs(req.files);

    if (action === 'download') {
      // Send PDF directly for download
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="combined-${Date.now()}.pdf"`,
        'Content-Length': combinedPdf.length
      });
      res.send(combinedPdf);
      console.log('✅ PDF sent for download');
    } else {
      // Upload to Backblaze and return URL
      const uploadResult = await pdfCombinerService.uploadToBackblaze(combinedPdf);
      
      res.json({
        success: true,
        publicUrl: uploadResult.publicUrl,
        fileName: uploadResult.fileName,
        size: combinedPdf.length,
        fileCount: req.files.length
      });
      console.log('✅ PDF uploaded to Backblaze:', uploadResult.publicUrl);
    }

  } catch (error) {
    console.error('❌ PDF combine error:', error);
    
    if (error.message.includes('Invalid PDF') || error.message.includes('corrupted')) {
      return res.status(400).json({
        error: 'Invalid PDF',
        message: 'One or more files are corrupted or not valid PDF files'
      });
    }

    if (error.message.includes('password') || error.message.includes('encrypted')) {
      return res.status(400).json({
        error: 'Protected PDF',
        message: 'Password-protected PDFs are not supported'
      });
    }

    res.status(500).json({
      error: 'Processing failed',
      message: 'Failed to combine PDFs. Please try again.'
    });
  }
});

// Health check endpoint
router.get('/pdf/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'PDF Combiner',
    maxFileSize: '100MB',
    maxFiles: 50,
    supportedFormats: ['PDF']
  });
});

module.exports = router;