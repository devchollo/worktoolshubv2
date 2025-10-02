const SibApiV3Sdk = require("@sendinblue/client");
const validator = require("validator");

const escapeHtml = (unsafe) => {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const sendContactFormEmail = async (contactData) => {
  const { name, email, subject, message } = contactData;

  // Validate and sanitize inputs
  const safeEmail = validator.normalizeEmail(email);
  const safeName = escapeHtml(name);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message);

  if (!validator.isEmail(safeEmail)) {
    throw new Error("Invalid email address");
  }

  if (!safeName || !safeSubject || !safeMessage) {
    throw new Error("All fields are required");
  }

  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.error("Brevo API key not configured");
    return { success: false, error: "Email service not configured" };
  }

  try {
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.setApiKey(
      SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
      apiKey
    );

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    // Email to admin
    sendSmtpEmail.sender = {
      email: safeEmail,
      name: safeName,
    };

    sendSmtpEmail.to = [
      {
        email: process.env.CONTACT_EMAIL || "devchollo@gmail.com",
        name: "WorkToolsHub Support",
      },
    ];

    sendSmtpEmail.replyTo = {
      email: safeEmail,
      name: safeName,
    };

    sendSmtpEmail.subject = `Contact Form: ${safeSubject}`;

    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #6366f1; }
          .message-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; white-space: pre-wrap; }
          .label { font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; }
          .value { color: #1e293b; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Contact Form Submission</h2>
          </div>
          <div class="content">
            <div class="info-box">
              <div class="label">From</div>
              <div class="value"><strong>${safeName}</strong></div>
              <div class="value">${safeEmail}</div>
            </div>
            
            <div class="info-box">
              <div class="label">Subject</div>
              <div class="value">${safeSubject}</div>
            </div>
            
            <div class="info-box">
              <div class="label">Message</div>
              <div class="message-box">${safeMessage}</div>
            </div>
            
            <div class="info-box">
              <div class="label">Timestamp</div>
              <div class="value">${new Date().toLocaleString()}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    // Send confirmation email to user
    await sendConfirmationEmail(safeEmail, safeName);

    return { success: true };
  } catch (error) {
    console.error("Contact form email error:", error);
    return { success: false, error: error.message };
  }
};

const sendConfirmationEmail = async (userEmail, userName) => {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.setApiKey(
      SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
      apiKey
    );

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.sender = {
      email: process.env.BREVO_SENDER_EMAIL || "devchollo@gmail.com",
      name: process.env.BREVO_SENDER_NAME || "WorkToolsHub",
    };

    sendSmtpEmail.to = [{ email: userEmail, name: userName }];
    sendSmtpEmail.subject = "We received your message";

    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Contacting Us!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>We've received your message and will get back to you as soon as possible.</p>
            <p>Our team typically responds within 24-48 hours during business days.</p>
            <p>If your matter is urgent, please reply to this email with "URGENT" in the subject line.</p>
            <div class="footer">
              <p>© ${new Date().getFullYear()} WorkToolsHub. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
  } catch (error) {
    console.error("Confirmation email error:", error);
  }
};

module.exports = { sendContactFormEmail };