// services/emailService.js
class EmailService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseUrl = "https://api.openai.com/v1/chat/completions";
    this.defaultModel = "gpt-3.5-turbo";
    this.defaultTemperature = 0.3;
  }

  async generateEmail(prompt, systemMessage, maxTokens = 1000) {
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
      console.log("📥 OpenAI response JSON:", data);

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response format from OpenAI API");
      }

      return data.choices[0].message.content;
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
      personnelName,
      customerName,
      customerContact,
      caseId,
      formattedTimeframe,
      briefNotes,
    } = data;

    const prompt = `
Please create a professional OBCX callback email with the following information:

**OBCX Personnel:** ${personnelName}
**Customer Information:**
- Customer Name: ${customerName}
- Contact Number: ${customerContact}
- Case ID: ${caseId}

**Callback Schedule:**
- Timeframe: ${formattedTimeframe}

**Notes:** ${briefNotes}

Please:
1. Add a professional greeting
2. Clearly communicate the callback schedule and timeframe
3. Improve grammar and clarity in the notes while maintaining the original meaning
4. Structure it as a professional callback confirmation email
5. Add appropriate context about the OBCX callback process
6. Include a professional closing with "Best Regards, [Your Name]"
7. Make it sound professional and reassuring to the customer

Structure it as a formal callback scheduling email that would be sent to confirm the callback appointment with the customer.
  `;

    const systemMessage =
      "You are a professional customer service communication assistant. Generate well-structured, professional OBCX callback emails with proper grammar and formatting that reassure customers about their scheduled callback.";

    return this.generateEmail(prompt, systemMessage, 800);
  }

  generateOfflineModifications(data) {
    const { urlPage, changes } = data;

    // Generate internal note
    const changesText = changes
      .map((change, index) => `${index + 1}. ${change}`)
      .join("\n");

    const internalNotePrompt = `
Please improve the grammar and clarity of these website changes while maintaining their original meaning:

${changesText}

Format the response as individual change descriptions that are clear and professional for internal documentation.
  `;

    // Generate client email
    const clientEmailPrompt = `
Please create a professional client-facing email about completed website modifications:

**Website/Page:** ${urlPage}

**Changes Made:**
${changesText}

Please:
1. Add a professional greeting
2. Clearly communicate that the changes have been completed
3. Improve grammar and clarity in the change descriptions while maintaining the original meaning
4. Structure it as a professional completion notification email
5. Add appropriate context about the modifications being live
6. Include a professional closing with "Best Regards, [Your Name]"
7. Make it sound professional and reassuring to the client

Structure it as a professional website modification completion email.
  `;

    const systemMessage =
      "You are a professional web development communication assistant. Generate clear, professional content for website modification documentation and client communications.";

    // Return both internal note and client email
    return Promise.all([
      this.generateInternalNote(urlPage, internalNotePrompt),
      this.generateEmail(clientEmailPrompt, systemMessage, 800),
    ]).then(([internalNote, clientEmail]) => ({
      internalNote,
      clientEmail,
    }));
  }

  async generateInternalNote(urlPage, improvedChangesPrompt) {
    const improvedChanges = await this.generateEmail(
      improvedChangesPrompt,
      "You are a professional technical writer. Improve grammar and clarity while maintaining the original meaning.",
      500
    );

    return `-- FULFILLMENT MOD COMPLETED --
COMPLETED:
Page/URL: ${urlPage}
Change Made: ${improvedChanges}
Next Steps:
Advised the client to submit additional changes through site changes form or call in for further support.
Request closed and being reviewed by quality control.`;
  }
}

module.exports = new EmailService();
