// routes/emailRoutes.js
const express = require('express');
const emailService = require('../services/emailService');
const { Validator, ValidationError } = require('../utils/validation');

const router = express.Router();

// Middleware for error handling
// const handleEmailGeneration = (validationFn, generationFn) => {
//   return async (req, res) => {
//     try {
//       // Sanitize input data
//       const sanitizedData = Validator.sanitizeData(req.body);
      
//       // Validate data
//       validationFn(sanitizedData);
      
//       // Generate email
//       const generatedEmail = await generationFn(sanitizedData);
      
//       res.json({ 
//         email: generatedEmail,
//         success: true
//       });

//     } catch (error) {
//       console.error(`Email generation error:`, error);
      
//       if (error instanceof ValidationError) {
//         return res.status(400).json({ 
//           error: 'Validation failed',
//           message: error.message,
//           field: error.field
//         });
//       }
      
//       // Handle OpenAI API errors
//       if (error.message.includes('OpenAI API error')) {
//         return res.status(502).json({ 
//           error: 'AI service unavailable',
//           message: 'The AI service is currently unavailable. Please try again later.'
//         });
//       }
      
//       // Generic server error
//       res.status(500).json({ 
//         error: 'Email generation failed',
//         message: 'An unexpected error occurred. Please try again later.'
//       });
//     }
//   };
// };
const handleEmailGeneration = (validationFn, generationFn) => {
  return async (req, res) => {
    console.log("📩 Incoming request body:", req.body);

    try {
      const sanitizedData = Validator.sanitizeData(req.body);
      console.log("✅ Sanitized Data:", sanitizedData);

      validationFn(sanitizedData);
      console.log("✅ Validation passed");

      const generatedEmail = await generationFn(sanitizedData);
      console.log("✅ Email generated successfully");

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


// debugging
router.get('/ping', (req, res) => {
  res.json({ msg: 'emailRoutes mounted!' });
});


// Escalation Email Route
router.post('/generate-escalation-email', 
  handleEmailGeneration(
    Validator.validateEscalationEmail,
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

// OSAD Note Route (for future implementation)
router.post('/generate-osad-note',
  handleEmailGeneration(
    Validator.validateOSADNote,
    emailService.generateOSADNote.bind(emailService)
  )
);

// Health check for email service
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Email Generation API',
    timestamp: new Date().toISOString(),
    routes: [
      '/api/email/generate-escalation-email',
      '/api/email/generate-lbl-email',
      '/api/email/generate-osad-note'
    ]
  });
});

module.exports = router;