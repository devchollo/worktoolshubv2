// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'https://wthv2.vercel.app', // Add your Vercel URL
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// API Routes
// Email verification endpoint
app.post('/api/auth/verify-email', (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        authorized: false, 
        message: 'Email is required' 
      });
    }

    // Get authorized emails from environment variables
    const authorizedEmails = process.env.AUTHORIZED_EMAILS?.split(',') || [];
    const normalizedEmail = email.toLowerCase().trim();
    const isAuthorized = authorizedEmails.includes(normalizedEmail);
    
    // Log authentication attempts (optional - remove in production if not needed)
    console.log(`Auth attempt: ${email} - ${isAuthorized ? 'GRANTED' : 'DENIED'}`);
    
    res.json({ 
      authorized: isAuthorized,
      message: isAuthorized ? 'Access granted' : 'Access denied'
    });
    
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      authorized: false, 
      message: 'Internal server error' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'WorkToolsHub API Server',
    status: 'running',
    endpoints: ['/api/health', '/api/auth/verify-email']
  });
});




// Add this endpoint to your server.js file

app.post('/api/generate-escalation-email', async (req, res) => {
  try {
    const {
      cid,
      callerName,
      phoneNumber,
      domain,
      iCase,
      issueSummary,
      modRequestDetails,
      expectationSet,
      expectedResolution,
      solutionsProvided,
      nextSteps
    } = req.body;

    // Validate required fields
    const requiredFields = { cid, callerName, phoneNumber, domain, iCase, issueSummary, nextSteps };
    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value || !value.trim()) {
        return res.status(400).json({ 
          error: 'Validation failed',
          message: `${field} is required`
        });
      }
    }

    // Prepare content for OpenAI
    const emailContent = `
Please improve and format this escalation email professionally:

**Client Information:**
- CID/CPROD: ${cid}
- Caller Name: ${callerName}
- Phone Number: ${phoneNumber}
- Domain: ${domain}
- I-Case: ${iCase}

**Issue Details:**
Issue Summary: ${issueSummary}

${modRequestDetails ? `Mod Request Details: ${modRequestDetails}` : ''}

${expectationSet ? `Expectation Set with Client: ${expectationSet}` : ''}

${expectedResolution ? `Expected Resolution/Fix: ${expectedResolution}` : ''}

${solutionsProvided ? `Solutions Provided: ${solutionsProvided}` : ''}

**Next Steps:** ${nextSteps}

Please:
1. Add a professional greeting
2. Improve grammar and clarity while maintaining the original meaning
3. Structure it as a professional escalation email
4. Add a professional closing with "Best Regards, [Your Name]"
5. Keep all the technical details and case information intact
    `;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional business communication assistant. Generate well-structured, professional escalation emails with proper grammar and formatting.'
          },
          {
            role: 'user',
            content: emailContent
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const generatedEmail = openaiData.choices[0].message.content;

    res.json({ 
      email: generatedEmail,
      success: true
    });

  } catch (error) {
    console.error('Email generation error:', error);
    res.status(500).json({ 
      error: 'Email generation failed',
      message: 'Please try again later'
    });
  }
});


// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path 
  });
});





// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🔐 Auth emails loaded: ${process.env.AUTHORIZED_EMAILS ? 'YES' : 'NO'}`);
  
  if (!process.env.AUTHORIZED_EMAILS) {
    console.warn('⚠️  WARNING: AUTHORIZED_EMAILS not set in environment variables');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Server shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Server shutting down gracefully...');
  process.exit(0);
});