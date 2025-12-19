// routes/notesRoutes.js
const express = require('express');
const router = express.Router();

// Notes service class - similar to your emailService but separate
class NotesService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = "https://api.openai.com/v1/chat/completions";
    this.defaultModel = "gpt-3.5-turbo";
    this.defaultTemperature = 0.3;
  }

  async generateNote(prompt, systemMessage, maxTokens = 1000) {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [
            {
              role: "system",
              content: systemMessage,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: maxTokens,
          temperature: this.defaultTemperature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenAI API error: ${response.status} - ${
            errorData.error?.message || "Unknown error"
          }`
        );
      }

      const data = await response.json();
      console.log("📥 OpenAI response for notes:", data);

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response format from OpenAI API");
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error("OpenAI API call failed for notes:", error);
      throw error;
    }
  }
}

// Create instance of notes service
const notesService = new NotesService();

// =====================================================
// EXISTING ROUTES - OSAD AND SITE LAUNCH
// =====================================================

// Generate OSAD or Site Launch notes
router.post('/generate', async (req, res) => {
  try {
    const { type, ...data } = req.body;
    
    if (!type || !['osad', 'launch'].includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid note type. Must be "osad" or "launch"' 
      });
    }
    
    let template = '';
    let prompt = '';
    let systemMessage = '';
    
    if (type === 'osad') {
      // Validate OSAD required fields
      if (!data.issueReproduction || !data.troubleshooting || !data.contactPerson) {
        return res.status(400).json({ 
          error: 'Missing required fields for OSAD note' 
        });
      }
      
      template = generateOSADTemplate(data);
      prompt = `Please review and improve the following OSAD technical support note for grammar, clarity, and professionalism. Maintain the structure and technical details, but make it more polished and clear:

${template}`;

      systemMessage = "You are a professional technical writer who specializes in creating clear, concise, and well-structured technical documentation. Your task is to improve grammar, clarity, and professionalism while maintaining all technical details and the original structure.";
      
    } else if (type === 'launch') {
      // Validate Launch required fields
      if (!data.domainName || !data.domainVerification || !data.sslPurchased || !data.contactPerson) {
        return res.status(400).json({ 
          error: 'Missing required fields for site launch note' 
        });
      }
      
      template = generateLaunchTemplate(data);
      prompt = `Please review and improve the following site launch documentation for grammar, clarity, and professionalism. Maintain the structure and all important details:

${template}`;

      systemMessage = "You are a professional technical writer who specializes in creating clear, concise, and well-structured technical documentation. Your task is to improve grammar, clarity, and professionalism while maintaining all technical details and the original structure.";
    }
    
    // Use the notes service to generate improved content
    try {
      const improvedNote = await notesService.generateNote(prompt, systemMessage, 1000);
      
      if (!improvedNote) {
        console.warn('OpenAI response was empty, using template');
        return res.json({ note: template, fallback: true });
      }
      
      res.json({ 
        note: improvedNote.trim(),
        original: template,
        type: type
      });
      
    } catch (aiError) {
      console.error('AI enhancement failed:', aiError);
      
      // Fallback to template if AI fails
      return res.json({ 
        note: template,
        fallback: true,
        message: 'AI enhancement unavailable, returning template'
      });
    }
    
  } catch (error) {
    console.error('Error generating note:', error);
    res.status(500).json({ 
      error: 'Failed to generate note',
      message: error.message 
    });
  }
});

// Generate OSAD template
function generateOSADTemplate(data) {
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  
  return `TECHNICAL SUPPORT - OSAD NOTE
Generated: ${timestamp}

==========================================
ISSUE REPRODUCTION & OBSERVATION
==========================================
${data.issueReproduction}

==========================================
TROUBLESHOOTING & SOLUTIONS ATTEMPTED
==========================================
${data.troubleshooting}

==========================================
CONTACT INFORMATION
==========================================
${data.contactPerson}`;
}

// Generate Site Launch template
function generateLaunchTemplate(data) {
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  
  const domainStatus = getDomainStatusText(data.domainVerification);
  const sslStatus = data.sslPurchased === 'yes' ? 'SSL Certificate purchased' : 'No SSL Certificate purchased';
  
  return `SITE LAUNCH DOCUMENTATION
Generated: ${timestamp}

==========================================
DOMAIN INFORMATION
==========================================
Domain Name: ${data.domainName}
Domain Status: ${domainStatus}

==========================================
SSL CERTIFICATE STATUS
==========================================
${sslStatus}
${data.sslPurchased === 'no' ? '\n⚠️  Note: Consider recommending SSL for security and SEO benefits' : ''}

==========================================
DOMAIN VERIFICATION DETAILS
==========================================
${getDomainVerificationDetails(data.domainVerification)}

==========================================
CONTACT INFORMATION
==========================================
${data.contactPerson}

==========================================
LAUNCH CHECKLIST & STATUS
==========================================
✅ Domain verification completed
${data.sslPurchased === 'yes' ? '✅' : '⚠️'} SSL Certificate ${data.sslPurchased === 'yes' ? 'confirmed' : 'not purchased'}
✅ Contact person identified
${data.domainVerification === 'needs-action' ? '🔄 Domain merge/transfer required' : '✅ Domain configuration verified'}`;
}

// Helper function to get domain status text
function getDomainStatusText(verification) {
  switch (verification) {
    case 'registered':
      return 'Domain is registered with us - Ready for launch';
    case 'pointed':
      return 'Domain is pointed to us - DNS configuration verified';
    case 'needs-action':
      return 'Domain requires merge or transfer - Action needed before launch';
    default:
      return 'Domain status unknown';
  }
}

// Helper function to get detailed verification info
function getDomainVerificationDetails(verification) {
  switch (verification) {
    case 'registered':
      return `✅ Domain Registration Status: CONFIRMED
- Domain is registered under our account
- Full control and management available
- Ready for immediate deployment`;
      
    case 'pointed':
      return `✅ Domain DNS Status: CONFIGURED
- Domain DNS is properly pointed to our servers
- Name servers are correctly configured
- Ready for website deployment`;
      
    case 'needs-action':
      return `⚠️  Domain Account Status: ACTION REQUIRED
- Domain is not in the same account
- Requires domain merge or transfer process
- Must be completed before launch can proceed
- Contact domain administrator for transfer authorization`;
      
    default:
      return 'Domain verification details not available';
  }
}

// =====================================================
// NEW ROUTE - PEGA NOTE TEXT IMPROVEMENT
// =====================================================

// XSS Protection function
function sanitizeInput(input) {
  if (!input) return '';
  
  return String(input)
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/vbscript:/gi, '')
    .trim()
    .substring(0, 2000);
}

// Validate PEGA input
function validatePEGAInput(data) {
  const errors = [];
  
  if (!data.concern || data.concern.trim().length < 5) {
    errors.push('Concern must be at least 5 characters');
  }
  
  if (!data.actionDone || data.actionDone.trim().length < 5) {
    errors.push('Action Done must be at least 5 characters');
  }
  
  if (data.concern && data.concern.length > 2000) {
    errors.push('Concern is too long (max 2000 characters)');
  }
  
  if (data.actionDone && data.actionDone.length > 2000) {
    errors.push('Action Done is too long (max 2000 characters)');
  }
  
  if (data.nextAction && data.nextAction.length > 2000) {
    errors.push('Next Action is too long (max 2000 characters)');
  }
  
  return errors;
}

// POST /api/notes/improve-pega-text - Improve PEGA note text with AI
router.post('/improve-pega-text', async (req, res) => {
  try {
    const { concern, actionDone, nextAction } = req.body;
    
    // Sanitize inputs
    const sanitizedData = {
      concern: sanitizeInput(concern),
      actionDone: sanitizeInput(actionDone),
      nextAction: sanitizeInput(nextAction)
    };
    
    // Validate
    const validationErrors = validatePEGAInput(sanitizedData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }
    
    // Build prompt for AI
    let prompt = `Please improve the grammar and clarity of the following support note sections. Maintain technical accuracy and professional tone. Return ONLY a JSON object with keys: concern, actionDone, and nextAction.

CONCERN:
${sanitizedData.concern}

ACTION DONE:
${sanitizedData.actionDone}`;

    if (sanitizedData.nextAction && sanitizedData.nextAction.trim()) {
      prompt += `

NEXT ACTION:
${sanitizedData.nextAction}`;
    }

    prompt += `

Return format: {"concern": "improved text", "actionDone": "improved text", "nextAction": "improved text or empty string"}`;
    
    const systemMessage = `You are a professional support documentation assistant. Your task is to improve grammar, clarity, and professionalism of support notes while maintaining the original meaning and technical accuracy. Keep the tone professional but friendly. Do not add information that wasn't provided. Always return valid JSON.`;
    
    // Use existing NotesService
    try {
      const aiResponse = await notesService.generateNote(prompt, systemMessage, 800);
      
      // Parse AI response
      let improvedText;
      try {
        // Try to extract JSON from the response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          improvedText = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.warn('Failed to parse AI response as JSON, using original text');
        improvedText = {
          concern: sanitizedData.concern,
          actionDone: sanitizedData.actionDone,
          nextAction: sanitizedData.nextAction
        };
      }
      
      // Sanitize AI output as well (defense in depth)
      const finalOutput = {
        concern: sanitizeInput(improvedText.concern || sanitizedData.concern),
        actionDone: sanitizeInput(improvedText.actionDone || sanitizedData.actionDone),
        nextAction: sanitizeInput(improvedText.nextAction || sanitizedData.nextAction || '')
      };
      
      res.json(finalOutput);
      
    } catch (aiError) {
      console.error('AI enhancement failed for PEGA text:', aiError);
      
      // Fallback to original text
      return res.json({
        concern: sanitizedData.concern,
        actionDone: sanitizedData.actionDone,
        nextAction: sanitizedData.nextAction,
        fallback: true,
        message: 'AI enhancement unavailable, returning original text'
      });
    }
    
  } catch (error) {
    console.error('PEGA text improvement error:', error);
    
    // Return original text as fallback
    res.status(500).json({
      error: 'AI service temporarily unavailable',
      concern: sanitizeInput(req.body.concern || ''),
      actionDone: sanitizeInput(req.body.actionDone || ''),
      nextAction: sanitizeInput(req.body.nextAction || ''),
      fallback: true
    });
  }
});

// =====================================================
// HEALTH CHECK
// =====================================================

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Notes Generation API',
    timestamp: new Date().toISOString(),
    openai: process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured',
    endpoints: {
      '/generate': 'Generate OSAD or Site Launch notes',
      '/improve-pega-text': 'Improve PEGA note text with AI',
      '/health': 'Health check'
    }
  });
});

module.exports = router;