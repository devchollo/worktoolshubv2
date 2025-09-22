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

router.post('/generate-offline-modifications', async (req, res) => {
  try {
    const sanitizedData = Validator.sanitizeData(req.body);
    Validator.validateOfflineModifications(sanitizedData);
    
    const results = await emailService.generateOfflineModifications(sanitizedData);
    
    res.json({ 
      internalNote: results.internalNote,
      clientEmail: results.clientEmail,
      success: true
    });

  } catch (error) {
    console.error('Offline modifications generation error:', error);
    
    if (error instanceof ValidationError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        message: error.message,
        field: error.field
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
    status: 'OK',
    service: 'Email Generation API',
    timestamp: new Date().toISOString(),
    routes: [
      '/api/email/generate-escalation-email',
      '/api/email/generate-lbl-email'
    ]
  });
});

module.exports = router;