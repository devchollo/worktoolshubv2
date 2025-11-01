// services/emailService.js
class EmailService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = "https://api.openai.com/v1/chat/completions";
    this.defaultModel = "gpt-3.5-turbo";
    this.defaultTemperature = 0.3;
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

  async generateEmail(prompt, systemMessage, maxTokens = 1000) {
    if (!this.apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const safePrompt = this.sanitizeForPrompt(prompt);
    const safeSystemMessage = this.sanitizeForPrompt(systemMessage);

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

    const prompt = `
Please improve and format this escalation email professionally:

**Client Information:**
- CID/CPROD: ${cid}
- Caller Name: ${callerName}
- Phone Number: ${phoneNumber}
- Domain: ${domain}
- I-Case: ${iCase}

**Issue Details:**
Issue Summary: ${issueSummary}

${modRequestDetails ? `Mod Request Details: ${modRequestDetails}` : ""}
${expectationSet ? `Expectation Set with Client: ${expectationSet}` : ""}
${expectedResolution ? `Expected Resolution/Fix: ${expectedResolution}` : ""}
${solutionsProvided ? `Solutions Provided: ${solutionsProvided}` : ""}

**Next Steps:** ${nextSteps}

Please:
1. Add a professional greeting
2. Improve grammar and clarity while maintaining the original meaning
3. Structure it as a professional escalation email
4. Add a professional closing with "Best Regards, [Your Name]"
5. Keep all the technical details and case information intact
    `;

    const systemMessage =
      "You are a professional business communication assistant. Generate well-structured, professional escalation emails with proper grammar and formatting.";

    return this.generateEmail(prompt, systemMessage, 1000);
  }

  generateLBLEmail(data) {
    const { cid, businessName, changes } = data;

    const changesText = changes
      .map((change, index) => `${index + 1}. ${change}`)
      .join("\n");

    const prompt = `
Please create a professional local business listing update request email with the following information:

**Request Details:**
- CID/CPROD: ${cid}
- Business Name: ${businessName}

**Requested Changes:**
${changesText}

Please:
1. Add a professional greeting
2. Create a clear, concise request for updating the business listing
3. Improve grammar and clarity while maintaining the original meaning
4. Format the changes in a professional, easy-to-read manner
5. Add appropriate context about why these updates are needed
6. Include a professional closing with "Best Regards, [Your Name]"
7. Make it sound professional and courteous

Structure it as a formal business update request email that would be sent to a business directory or listing service.
    `;

    const systemMessage =
      "You are a professional business communication assistant. Generate well-structured, professional business listing update request emails with proper grammar and formatting.";

    return this.generateEmail(prompt, systemMessage, 800);
  }

  generateOBCXCallbackEmail(data) {
    const { 
      personnelName, customerName, customerContact, caseId, 
      formattedTimeframe, briefNotes 
    } = data;

    const prompt = `
Please create a professional internal email to OBCX personnel about a client callback request:

**To:** ${personnelName} (OBCX Personnel)
**Regarding:** Client Callback Request

**Client Information:**
- Customer Name: ${customerName}
- Contact Number: ${customerContact}
- Case ID: ${caseId}

**Requested Callback Window:**
- Timeframe: ${formattedTimeframe}

**Notes:** ${briefNotes}

Please:
1. Add a professional greeting addressing the OBCX personnel
2. Clearly communicate that this is a callback request FROM the client
3. Provide all necessary client information for the callback
4. Improve grammar and clarity in the notes while maintaining the original meaning
5. Structure it as a professional internal notification email
6. Include callback instructions and context
7. Add a professional closing with "Best Regards, [Your Name]"
8. Make it clear this is an action item for the OBCX personnel

Structure it as an internal notification email informing OBCX personnel about a client's callback request.
    `;

    const systemMessage = 'You are a professional internal communication assistant. Generate well-structured, professional internal emails that notify OBCX personnel about client callback requests with proper grammar and clear action items.';

    return this.generateEmail(prompt, systemMessage, 800);
  }

  generateOfflineModifications(data) {
    const { pages } = data;

    // Normalize URLs in pages before processing
    const normalizedPages = pages.map(page => ({
      ...page,
      url: this.normalizeUrl(page.url)
    }));

    // Prepare all pages and changes for processing
    const pagesText = normalizedPages.map((page, index) => {
      const changesText = page.changes.map((change, changeIndex) => 
        `  ${changeIndex + 1}. ${change}`
      ).join('\n');
      return `Page ${index + 1}: ${page.url}\n${changesText}`;
    }).join('\n\n');

    // Generate internal note prompt
    const internalNotePrompt = `
Please improve the grammar and clarity of these website changes while maintaining their original meaning:

${pagesText}

IMPORTANT: Return ONLY the improved change descriptions in the same format. Keep URLs exactly as provided without any encoding. Format as:
Page 1: [url]
  1. [change description]
  2. [change description]

Page 2: [url]
  1. [change description]

Do not add any extra headers, commentary, or formatting beyond the page-by-page list.
    `;

    // Generate client email prompt
    const clientEmailPrompt = `
Please create a professional client-facing email about completed website modifications across multiple pages:

**Pages Modified and Changes:**
${pagesText}

Please:
1. Add a professional greeting
2. Clearly communicate that all changes have been completed
3. Improve grammar and clarity in the change descriptions while maintaining the original meaning
4. Structure it as a professional completion notification email organized by page
5. Add appropriate context about the modifications being live
6. Include a professional closing with "Best Regards, [Your Name]"
7. Make it sound professional and reassuring to the client
8. Keep all URLs exactly as provided without encoding them

Structure it as a professional website modification completion email.
    `;

    const systemMessage = 'You are a professional web development communication assistant. Generate clear, professional content for website modification documentation and client communications. Never encode URLs - keep them in their original readable format.';

    // Return both internal note and client email
    return Promise.all([
      this.generateInternalNote(normalizedPages, internalNotePrompt),
      this.generateEmail(clientEmailPrompt, systemMessage, 1000)
    ]).then(([internalNote, clientEmail]) => ({
      internalNote,
      clientEmail
    }));
  }

  async generateInternalNote(pages, improvedChangesPrompt) {
    const improvedChanges = await this.generateEmail(
      improvedChangesPrompt, 
      'You are a professional technical writer. Improve grammar and clarity while maintaining the original meaning. Never encode URLs - keep them in their original readable format with normal slashes and colons.',
      800
    );
    
    // Build pages section with normalized URLs
    const pagesSection = pages.map((page, index) => 
      `Page ${index + 1}: ${page.url}`
    ).join('\n');
    
    return `-- FULFILLMENT MOD COMPLETED --
COMPLETED:
${pagesSection}

Changes Made:
${improvedChanges}

Next Steps:
Advised the client to submit additional changes through site changes form or call in for further support.
Request closed and being reviewed by quality control.`;
  }
}

module.exports = new EmailService();