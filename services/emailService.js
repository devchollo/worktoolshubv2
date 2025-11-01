// services/emailService.js
class EmailService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = "https://api.openai.com/v1/chat/completions";
    this.defaultModel = "gpt-3.5-turbo";
    // Use different temperatures for different tasks
    this.factualTemperature = 0.1; // For improving grammar/facts
    this.creativeTemperature = 0.4; // For composing emails (balanced)
  }

  // Helper function to decode HTML entities
  decodeHtmlEntities(text) {
    if (!text) return text;
    
    const entities = {
      '&#x2F;': '/',
      '&#x2f;': '/',
      '&#47;': '/',
      '&sol;': '/',
      '&#x3A;': ':',
      '&#x3a;': ':',
      '&#58;': ':',
      '&colon;': ':',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#x27;': "'",
      '&#39;': "'",
      '&#x40;': '@',
      '&#64;': '@',
      '&commat;': '@'
    };
    
    let decoded = text;
    for (const [entity, char] of Object.entries(entities)) {
      decoded = decoded.split(entity).join(char);
    }
    
    return decoded;
  }

  // Helper function to normalize URLs
  normalizeUrl(url) {
    if (!url) return url;
    
    // First decode any HTML entities
    let cleaned = this.decodeHtmlEntities(url.trim());
    
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, '');
    
    return cleaned;
  }

  sanitizeForPrompt(text) {
    if (!text) return '';
    
    let cleaned = String(text).trim();
    
    // Remove potential prompt injection patterns
    cleaned = cleaned.replace(/ignore previous instructions/gi, '[filtered]');
    cleaned = cleaned.replace(/system:|assistant:|user:/gi, '[filtered]');
    cleaned = cleaned.replace(/<\|.*?\|>/g, '[filtered]');
    
    // Limit length
    cleaned = cleaned.substring(0, 2000);
    
    return cleaned;
  }

  async generateEmail(prompt, systemMessage, maxTokens = 1000, temperature = null) {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const safePrompt = this.sanitizeForPrompt(prompt);
    const safeSystemMessage = this.sanitizeForPrompt(systemMessage);
    
    // Use provided temperature or default to creative temperature
    const useTemperature = temperature !== null ? temperature : this.creativeTemperature;

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
              content: safeSystemMessage,
            },
            {
              role: "user",
              content: safePrompt,
            },
          ],
          max_tokens: Math.min(maxTokens, 2000),
          temperature: useTemperature,
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
      console.log("📥 OpenAI response received");

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response format from OpenAI API");
      }

      // Decode HTML entities from the AI response
      const content = data.choices[0].message.content;
      return this.decodeHtmlEntities(content);
    } catch (error) {
      console.error("OpenAI API call failed:", error);
      throw error;
    }
  }

  // Validation helper to check for hallucinated content
  validateContentIntegrity(originalData, generatedContent, context = 'email') {
    const warnings = [];
    
    // Check if generated content is suspiciously longer than input
    const inputLength = JSON.stringify(originalData).length;
    const outputLength = generatedContent.length;
    
    if (outputLength > inputLength * 3) {
      warnings.push(`${context}: Output is ${Math.round(outputLength/inputLength)}x longer than input - possible hallucination`);
    }
    
    // Log warnings if any
    if (warnings.length > 0) {
      warnings.forEach(w => console.warn(`⚠️ ${w}`));
    }
    
    return warnings.length === 0;
  }

  generateEscalationEmail(data) {
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
      nextSteps,
    } = data;

    // Sanitize all inputs
    const safeCid = this.sanitizeForPrompt(cid);
    const safeCallerName = this.sanitizeForPrompt(callerName);
    const safePhoneNumber = this.sanitizeForPrompt(phoneNumber);
    const safeDomain = this.sanitizeForPrompt(domain);
    const safeICase = this.sanitizeForPrompt(iCase);
    const safeIssueSummary = this.sanitizeForPrompt(issueSummary);
    const safeModRequestDetails = this.sanitizeForPrompt(modRequestDetails);
    const safeExpectationSet = this.sanitizeForPrompt(expectationSet);
    const safeExpectedResolution = this.sanitizeForPrompt(expectedResolution);
    const safeSolutionsProvided = this.sanitizeForPrompt(solutionsProvided);
    const safeNextSteps = this.sanitizeForPrompt(nextSteps);

    const prompt = `
Create a professional escalation email using the information below.

FACTUAL REQUIREMENTS (Must be exact - DO NOT change or add):
- CID/CPROD: ${safeCid}
- Caller Name: ${safeCallerName}
- Phone Number: ${safePhoneNumber}
- Domain: ${safeDomain}
- I-Case: ${safeICase}
- Issue Summary: ${safeIssueSummary}
${safeModRequestDetails ? `- Mod Request Details: ${safeModRequestDetails}` : ""}
${safeExpectationSet ? `- Expectation Set: ${safeExpectationSet}` : ""}
${safeExpectedResolution ? `- Expected Resolution: ${safeExpectedResolution}` : ""}
${safeSolutionsProvided ? `- Solutions Provided: ${safeSolutionsProvided}` : ""}
- Next Steps: ${safeNextSteps}

CREATIVE REQUIREMENTS (Where you can be creative):
- Write a professional greeting appropriate for an escalation
- Improve the grammar and flow of the issue description
- Structure the email professionally with clear sections
- Add professional transitions between sections
- Write a professional closing signature placeholder

STRICT RULES:
✓ You CAN: Improve grammar, add professional tone, restructure for clarity
✗ You CANNOT: Add technical details, solutions, or information not listed above
✗ You CANNOT: Add steps, troubleshooting, or recommendations beyond what's provided
✗ You CANNOT: Change any factual information (names, numbers, case details)
✗ You CANNOT: Assume what was tried or what should be done next

Focus on making it read professionally while keeping all facts exactly as provided.
    `;

    const systemMessage = `You are a professional business communication specialist.
Your role: Transform rough notes into polished, professional escalation emails.
Your limits: Use ONLY the facts provided. Do not add technical details or solutions.
Be creative with: Tone, structure, transitions, and professional language.
Never invent: Case details, solutions, troubleshooting steps, or technical information.`;

    return this.generateEmail(prompt, systemMessage, 1000, this.creativeTemperature)
      .then(email => {
        this.validateContentIntegrity(data, email, 'Escalation Email');
        return email;
      });
  }

  generateLBLEmail(data) {
    const { cid, businessName, changes } = data;

    // Sanitize inputs
    const safeCid = this.sanitizeForPrompt(cid);
    const safeBusinessName = this.sanitizeForPrompt(businessName);
    
    // Sanitize and track changes with explicit markers
    const safeChanges = changes.map((change, index) => ({
      id: `CHANGE_${index + 1}`,
      number: index + 1,
      text: this.sanitizeForPrompt(change)
    }));

    // Create a marked-up version to track in output
    const changesListForTracking = safeChanges
      .map(change => `${change.id}: ${change.text}`)
      .join("\n");

    const changesTextForEmail = safeChanges
      .map(change => `${change.number}. ${change.text}`)
      .join("\n");

    const prompt = `
Create a professional business listing update request email using the information below.

FACTUAL REQUIREMENTS (Must be exact - DO NOT change or add):
- CID/CPROD: ${safeCid}
- Business Name: ${safeBusinessName}
- Total Changes Requested: ${safeChanges.length}

EXACT CHANGES TO INCLUDE (ALL ${safeChanges.length} - NO MORE, NO LESS):
${changesListForTracking}

CREATIVE REQUIREMENTS (Where you can be creative):
- Write a professional greeting
- Add context about why the business listing needs updating
- Improve grammar and clarity of each change description
- Structure the email professionally
- Add professional transitions and explanations
- Write a courteous closing

FORMAT REQUIREMENT:
List the changes clearly as:
1. [improved description of CHANGE_1]
2. [improved description of CHANGE_2]
${safeChanges.length > 2 ? `...\n${safeChanges.length}. [improved description of CHANGE_${safeChanges.length}]` : ''}

STRICT RULES:
✓ You CAN: Improve grammar, add professional context, explain why updates matter
✗ You CANNOT: Add changes beyond the ${safeChanges.length} listed above
✗ You CANNOT: Remove any of the ${safeChanges.length} changes
✗ You CANNOT: Invent new business details or modifications
✗ You CANNOT: Change the CID, business name, or core change requests

You must include exactly ${safeChanges.length} changes in the final email - verify this.
    `;

    const systemMessage = `You are a professional business communication specialist.
Your role: Create polished business listing update request emails.
Your limits: Include EXACTLY the number of changes provided. Do not add or remove changes.
Be creative with: Tone, context, explanations, and professional language.
Never invent: Additional changes, business details, or modifications not listed.
Verification: Count your output - it must have exactly the same number of changes as input.`;

    return this.generateEmail(prompt, systemMessage, 800, this.creativeTemperature)
      .then(email => {
        // Validate change count in output
        const numberedItems = email.match(/^\s*\d+\.\s+/gm);
        const itemCount = numberedItems ? numberedItems.length : 0;
        
        if (itemCount !== safeChanges.length) {
          console.warn(`⚠️ LBL Email: Expected ${safeChanges.length} changes, found ${itemCount}`);
        }
        
        this.validateContentIntegrity(data, email, 'LBL Email');
        return email;
      });
  }

  generateOBCXCallbackEmail(data) {
    const { 
      personnelName, customerName, customerContact, caseId, 
      formattedTimeframe, briefNotes 
    } = data;

    // Sanitize inputs
    const safePersonnelName = this.sanitizeForPrompt(personnelName);
    const safeCustomerName = this.sanitizeForPrompt(customerName);
    const safeCustomerContact = this.sanitizeForPrompt(customerContact);
    const safeCaseId = this.sanitizeForPrompt(caseId);
    const safeFormattedTimeframe = this.sanitizeForPrompt(formattedTimeframe);
    const safeBriefNotes = this.sanitizeForPrompt(briefNotes);

    const prompt = `
Create a professional internal OBCX callback notification email using the information below.

FACTUAL REQUIREMENTS (Must be exact - DO NOT change or add):
- OBCX Personnel: ${safePersonnelName}
- Customer Name: ${safeCustomerName}
- Contact Number: ${safeCustomerContact}
- Case ID: ${safeCaseId}
- Callback Timeframe: ${safeFormattedTimeframe}
- Notes from customer: ${safeBriefNotes}

CREATIVE REQUIREMENTS (Where you can be creative):
- Write a professional greeting to the OBCX personnel
- Add appropriate context about this being a callback request
- Improve grammar in the notes while keeping the exact meaning
- Structure the information clearly for quick action
- Add professional language to emphasize the action item
- Write a professional closing

STRICT RULES:
✓ You CAN: Improve tone, grammar, structure, and add professional context
✗ You CANNOT: Add callback instructions or steps not mentioned in the notes
✗ You CANNOT: Add additional notes or context not provided
✗ You CANNOT: Change any of the factual information (names, numbers, times)
✗ You CANNOT: Add assumptions about why the callback is needed

Make it clear this is an action item for OBCX personnel.
    `;

    const systemMessage = `You are a professional internal communication specialist.
Your role: Create clear, actionable callback notification emails for OBCX personnel.
Your limits: Use ONLY the information provided. Do not add instructions or additional context.
Be creative with: Tone, structure, urgency indicators, and professional language.
Never invent: Callback reasons, additional instructions, or context not provided.`;

    return this.generateEmail(prompt, systemMessage, 800, this.creativeTemperature)
      .then(email => {
        this.validateContentIntegrity(data, email, 'OBCX Callback Email');
        return email;
      });
  }

  async generateOfflineModifications(data) {
    const { pages } = data;

    // Normalize URLs and sanitize changes
    const normalizedPages = pages.map((page, pageIndex) => ({
      ...page,
      pageNumber: pageIndex + 1,
      url: this.normalizeUrl(page.url),
      changes: page.changes.map((change, changeIndex) => ({
        id: `P${pageIndex + 1}_C${changeIndex + 1}`,
        number: changeIndex + 1,
        original: this.sanitizeForPrompt(change)
      }))
    }));

    console.log(`📄 Processing ${normalizedPages.length} page(s) for offline modifications`);

    // Step 1: Improve grammar of each page's changes individually (FACTUAL - low temperature)
    const improvedPages = await Promise.all(
      normalizedPages.map(async (page) => {
        const changesWithIds = page.changes.map(change => 
          `${change.id}: ${change.original}`
        ).join('\n');
        
        const prompt = `
Improve ONLY the grammar and clarity of these ${page.changes.length} website change descriptions.

FACTUAL REQUIREMENTS:
- You must return EXACTLY ${page.changes.length} changes
- Keep the same technical meaning and details
- Do NOT add any new changes
- Do NOT remove any changes
- Do NOT add explanations or commentary

CHANGES TO IMPROVE:
${changesWithIds}

Return format (EXACTLY ${page.changes.length} items with their IDs):
P${page.pageNumber}_C1: [improved description]
P${page.pageNumber}_C2: [improved description]
${page.changes.length > 2 ? `...\nP${page.pageNumber}_C${page.changes.length}: [improved description]` : ''}

STRICT RULES:
✓ You CAN: Fix grammar, improve clarity, rephrase for professionalism
✗ You CANNOT: Add technical details not mentioned
✗ You CANNOT: Add or remove changes
✗ You CANNOT: Change the core meaning or technical content
`;
        
        const improved = await this.generateEmail(
          prompt,
          `You are a technical writing editor. Fix grammar and clarity only. 
          Return EXACTLY ${page.changes.length} items. Do not add or remove content.`,
          500,
          this.factualTemperature // Use low temperature for factual improvement
        );
        
        // Parse and validate the improved changes
        const improvedLines = improved.trim().split('\n').filter(line => line.trim().match(/^P\d+_C\d+:/));
        
        if (improvedLines.length !== page.changes.length) {
          console.warn(`⚠️ Page ${page.pageNumber}: Expected ${page.changes.length} changes, got ${improvedLines.length}. Using original.`);
          return {
            ...page,
            improvedChanges: page.changes.map((change, idx) => ({
              number: idx + 1,
              text: change.original
            }))
          };
        }
        
        // Extract improved text
        const improvedChanges = improvedLines.map((line, idx) => {
          const text = line.replace(/^P\d+_C\d+:\s*/, '').trim();
          return {
            number: idx + 1,
            text: text || page.changes[idx].original
          };
        });
        
        return {
          ...page,
          improvedChanges
        };
      })
    );

    // Step 2: Build internal note with improved changes
    const pagesSection = improvedPages.map(page => 
      `Page ${page.pageNumber}: ${page.url}`
    ).join('\n');
    
    const changesSection = improvedPages.map(page => {
      const changesList = page.improvedChanges.map(change => 
        `  ${change.number}. ${change.text}`
      ).join('\n');
      return `Page ${page.pageNumber}: ${page.url}\n${changesList}`;
    }).join('\n\n');
    
    const internalNote = `-- FULFILLMENT MOD COMPLETED --
COMPLETED:
${pagesSection}

Changes Made:
${changesSection}

Next Steps:
Advised the client to submit additional changes through site changes form or call in for further support.
Request closed and being reviewed by quality control.`;

    // Step 3: Generate client-facing email (CREATIVE - higher temperature)
    const pagesTextForEmail = improvedPages.map(page => {
      const changesList = page.improvedChanges.map(change => 
        `  ${change.number}. ${change.text}`
      ).join('\n');
      return `Page ${page.pageNumber}: ${page.url}\n${changesList}`;
    }).join('\n\n');

    const clientEmailPrompt = `
Create a professional client-facing email about completed website modifications.

FACTUAL REQUIREMENTS (Must be exact - DO NOT change or add):
- Total Pages Modified: ${improvedPages.length}
- All modifications have been completed and are now live

EXACT MODIFICATIONS BY PAGE (ALL ${improvedPages.length} pages - NO MORE, NO LESS):
${pagesTextForEmail}

CREATIVE REQUIREMENTS (Where you can be creative):
- Write a warm, professional greeting
- Add reassuring context about the modifications being complete
- Explain that changes are now live on their website
- Structure the email clearly by page
- Add professional transitions between sections
- Offer continued support in a professional way
- Write a friendly closing signature

STRICT RULES:
✓ You CAN: Add professional context, improve presentation, add reassuring tone
✗ You CANNOT: Add pages or modifications beyond the ${improvedPages.length} listed above
✗ You CANNOT: Change or encode the URLs
✗ You CANNOT: Add technical details about how changes were made
✗ You CANNOT: Modify the change descriptions (they're already finalized)

Keep all URLs in readable format (not encoded). Include exactly ${improvedPages.length} pages.
    `;

    const systemMessage = `You are a professional web development communication specialist.
Your role: Create polished, reassuring completion notification emails for clients.
Your limits: Include EXACTLY the pages and changes provided. Do not add modifications.
Be creative with: Tone, context, reassurance, professional presentation.
Never invent: Additional pages, changes, or technical details.
URLs: Keep in original readable format with normal slashes and colons.`;

    const clientEmail = await this.generateEmail(
      clientEmailPrompt, 
      systemMessage, 
      1000, 
      this.creativeTemperature // Use higher temperature for creative composition
    );

    // Validate client email doesn't have extra pages
    const pageMatches = clientEmail.match(/Page \d+:/g);
    if (pageMatches && pageMatches.length > improvedPages.length) {
      console.warn(`⚠️ Client email: Expected ${improvedPages.length} pages, found ${pageMatches.length} - possible hallucination`);
    }

    this.validateContentIntegrity({ pages: normalizedPages }, clientEmail, 'Offline Modifications Client Email');

    return {
      internalNote,
      clientEmail
    };
  }
}

module.exports = new EmailService();