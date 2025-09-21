// services/emailService.js
class EmailService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1/chat/completions';
    this.defaultModel = 'gpt-3.5-turbo';
    this.defaultTemperature = 0.3;
  }

  async generateEmail(prompt, systemMessage, maxTokens = 1000) {
    // debugger
    console.log("🔑 Using model:", this.defaultModel);
console.log("📤 Prompt:", prompt);

    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [
            {
              role: 'system',
              content: systemMessage
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: maxTokens,
          temperature: this.defaultTemperature
        })
      });

      // debugger
      console.log("📥 Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log("📥 OpenAI response JSON:", data);
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      throw error;
    }
  }

  generateEscalationEmail(data) {
    const {
      cid, callerName, phoneNumber, domain, iCase, issueSummary,
      modRequestDetails, expectationSet, expectedResolution, 
      solutionsProvided, nextSteps
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

    const systemMessage = 'You are a professional business communication assistant. Generate well-structured, professional escalation emails with proper grammar and formatting.';

    return this.generateEmail(prompt, systemMessage, 1000);
  }

  generateLBLEmail(data) {
    const { cid, businessName, changes } = data;

    const changesText = changes.map((change, index) => 
      `${index + 1}. ${change}`
    ).join('\n');

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

    const systemMessage = 'You are a professional business communication assistant. Generate well-structured, professional business listing update request emails with proper grammar and formatting.';

    return this.generateEmail(prompt, systemMessage, 800);
  }

  // Add more email types here as needed
  generateOSADNote(data) {
    // Future implementation for OSAD notes
    const prompt = `Generate an OSAD note with the provided data...`;
    const systemMessage = 'You are an expert at creating structured OSAD notes...';
    return this.generateEmail(prompt, systemMessage, 600);
  }
}

module.exports = new EmailService();