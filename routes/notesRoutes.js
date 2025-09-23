// routes/notesRoutes.js
const express = require('express');
const router = express.Router();

// Note: Make sure you have OpenAI configured
// You'll need to install: npm install openai
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    
    if (type === 'osad') {
      // Validate OSAD required fields
      if (!data.issueReproduction || !data.troubleshooting || !data.contactPerson) {
        return res.status(400).json({ 
          error: 'Missing required fields for OSAD note' 
        });
      }
      
      template = generateOSADTemplate(data);
      prompt = `Please review and improve the following OSAD technical support note for grammar, clarity, and professionalism. Maintain the structure and technical details, but make it more polished and clear:

${template}

Make sure to:
- Fix any grammar or spelling errors
- Improve clarity and readability
- Maintain professional tone
- Keep all technical details intact
- Ensure proper formatting and structure`;
      
    } else if (type === 'launch') {
      // Validate Launch required fields
      if (!data.domainName || !data.domainVerification || !data.sslPurchased || !data.contactPerson) {
        return res.status(400).json({ 
          error: 'Missing required fields for site launch note' 
        });
      }
      
      template = generateLaunchTemplate(data);
      prompt = `Please review and improve the following site launch documentation for grammar, clarity, and professionalism. Maintain the structure and all important details:

${template}

Make sure to:
- Fix any grammar or spelling errors
- Improve clarity and readability
- Maintain professional tone
- Keep all technical details and requirements intact
- Ensure proper formatting and structure`;
    }
    
    // Call OpenAI API for grammar and style improvement
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional technical writer who specializes in creating clear, concise, and well-structured technical documentation. Your task is to improve grammar, clarity, and professionalism while maintaining all technical details and the original structure."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
    });
    
    const improvedNote = completion.choices[0]?.message?.content?.trim();
    
    if (!improvedNote) {
      // Fallback to template if AI fails
      console.warn('OpenAI response was empty, using template');
      return res.json({ note: template });
    }
    
    res.json({ 
      note: improvedNote,
      original: template,
      type: type
    });
    
  } catch (error) {
    console.error('Error generating note:', error);
    
    // If OpenAI fails, return the template as fallback
    if (error.code === 'insufficient_quota' || error.code === 'rate_limit_exceeded') {
      const { type, ...data } = req.body;
      const template = type === 'osad' ? generateOSADTemplate(data) : generateLaunchTemplate(data);
      return res.json({ 
        note: template,
        fallback: true,
        message: 'AI enhancement unavailable, returning template'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate note',
      message: error.message 
    });
  }
});

// Generate OSAD template - FIXED VERSION
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
${data.contactPerson}

==========================================
STATUS & NEXT STEPS
==========================================
- Issue documented and troubleshooting steps recorded
- Contact person identified for follow-up
- Awaiting further action or escalation as needed

---
Note: This OSAD (Observation, Solution, Action, Documentation) note contains all relevant technical details for issue resolution and team coordination.`;
}

// Generate Site Launch template - COMPLETE VERSION
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
${data.domainVerification === 'needs-action' ? '🔄 Domain merge/transfer required' : '✅ Domain configuration verified'}

==========================================
NEXT STEPS
==========================================
${generateNextSteps(data)}

---
Note: This site launch documentation ensures all technical requirements are met and proper contacts are established for successful website deployment.`;
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

// Helper function to generate next steps
function generateNextSteps(data) {
  let steps = [];
  
  if (data.domainVerification === 'needs-action') {
    steps.push('1. Initiate domain merge or transfer process');
    steps.push('2. Coordinate with domain administrator');
    steps.push('3. Verify domain transfer completion');
  }
  
  if (data.sslPurchased === 'no') {
    steps.push(`${steps.length + 1}. Consider SSL certificate purchase for enhanced security`);
    steps.push(`${steps.length + 1}. Implement SSL configuration if certificate is acquired`);
  } else {
    steps.push(`${steps.length + 1}. Configure and install SSL certificate`);
    steps.push(`${steps.length + 1}. Verify SSL implementation and HTTPS redirect`);
  }
  
  steps.push(`${steps.length + 1}. Perform final pre-launch testing`);
  steps.push(`${steps.length + 1}. Coordinate launch timing with ${data.contactPerson}`);
  steps.push(`${steps.length + 1}. Monitor site performance post-launch`);
  
  return steps.join('\n');
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Notes Generation API',
    timestamp: new Date().toISOString(),
    openai: process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'
  });
});

module.exports = router;