// routes/emailRoutes.js
const express = require('express');
const emailService = require('../services/emailService');
const { Validator, ValidationError } = require('../utils/validation');

const router = express.Router();

const handleEmailGeneration = (validationFn, generationFn) => {
  return async (req, res) => {
    try {
      const sanitizedData = Validator.sanitizeData(req.body);
      validationFn(sanitizedData);
      const generatedEmail = await generationFn(sanitizedData);

      res.json({ 
        email: generatedEmail,
        success: true
      });

    } catch (error) {
      console.error("❌ Email generation error:", error);

      if (error instanceof ValidationError) {
        return res.status(400).json({ 
          error: 'Validation failed',
          message: error.message,
          field: error.field
        });
      }

      if (error.message.includes('OpenAI API error')) {
        return res.status(502).json({ 
          error: 'AI service unavailable',
          message: error.message
        });
      }

      res.status(500).json({ 
        error: 'Email generation failed',
        message: error.message
      });
    }
  };
};

// Escalation Email Route
router.post('/generate-escalation-email', 
  handleEmailGeneration(
    Validator.validateEscalationEmail.bind(Validator),
    emailService.generateEscalationEmail.bind(emailService)
  )
);

// LBL Email Route  
router.post('/generate-lbl-email',
  handleEmailGeneration(
    Validator.validateLBLEmail.bind(Validator),
    emailService.generateLBLEmail.bind(emailService)
  )
);

// OBCX Callback Email Route
router.post('/generate-obcx-callback',
  handleEmailGeneration(
    Validator.validateOBCXCallbackEmail.bind(Validator),
    emailService.generateOBCXCallbackEmail.bind(emailService)
  )
);

// Offline Modifications Route
router.post('/generate-offline-modifications', async (req, res) => {
  try {
    const sanitizedData = Validator.sanitizeData(req.body);
    Validator.validateOfflineModifications(sanitizedData);
    
    console.log(`📝 Generating offline modifications for ${sanitizedData.pages.length} page(s)`);
    
    const results = await emailService.generateOfflineModifications(sanitizedData);
    
    console.log('✅ Successfully generated both note and email');
    
    res.json({ 
      internalNote: results.internalNote,
      clientEmail: results.clientEmail,
      success: true
    });

  } catch (error) {
    console.error('❌ Offline modifications generation error:', error);
    
    if (error instanceof ValidationError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: error.message,
        field: error.field
      });
    }

    if (error.message.includes('OpenAI API key')) {
      return res.status(503).json({
        error: 'Service configuration error',
        message: 'AI service is not properly configured'
      });
    }

    if (error.message.includes('quota') || error.message.includes('rate limit')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.'
      });
    }
    
    res.status(500).json({ 
      error: 'Generation failed',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
});

// Health check for email service
router.get('/health', (req, res) => {
  res.json({
    status: process.env.OPENAI_API_KEY ? 'OK' : 'Misconfigured',
    service: 'Email Generation API',
    timestamp: new Date().toISOString(),
    openai: process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured',
    routes: [
      '/api/email/generate-escalation-email',
      '/api/email/generate-lbl-email',
      '/api/email/generate-obcx-callback',
      '/api/email/generate-offline-modifications',
      '/api/email/health'
    ]
  });
});

module.exports = router;