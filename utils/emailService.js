const SibApiV3Sdk = require("@sendinblue/client");
const crypto = require("crypto");
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

const sendAccountSetupEmail = async (
  userEmail,
  userName,
  setupToken,
  userRole
) => {
  const safeEmail = validator.normalizeEmail(userEmail);
  const safeName = escapeHtml(userName);
  const safeRole = escapeHtml(userRole);
  const safeToken = validator.escape(setupToken);

  if (!validator.isEmail(safeEmail)) {
    throw new Error("Invalid email address");
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

    sendSmtpEmail.sender = {
      email: process.env.BREVO_SENDER_EMAIL || "noreply@worktoolshub.info",
      name: process.env.BREVO_SENDER_NAME || "WorkToolsHub Admin",
    };

        sendSmtpEmail.to = [{ email: safeEmail, name: safeName }];
    sendSmtpEmail.subject = 'Set Up Your WorkToolsHub Account';

    const setupLink = `https://www.worktoolshub.info/setup-password.html?token=${setupToken}`;

    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1; }
          .button { display: inline-block; background: #6366f1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
          .footer { text-align: center; color: #64748b; font-size: 12px; margin-top: 30px; }
          .warning { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b; }
          code { background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to WorkToolsHub!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${safeName}</strong>,</p>
            <p>Your WorkToolsHub account has been created. You've been assigned the role of <strong>${safeRole}</strong>.</p>
            
            <div class="info-box">
              <p><strong>Your Work Email:</strong></p>
              <p><code>${safeEmail}</code></p>
              <p style="margin-top: 15px;">This is your login email. Please keep it secure.</p>
            </div>
            
            <p>To complete your account setup, please click the button below to create your password:</p>
            
            <center>
              <a href="${escapeHtml(setupLink)}" class="button">Set Up My Password</a>
            </center>
            
            <div class="warning">
              <strong>⏰ Important:</strong> This setup link will expire in 24 hours. Please complete your setup soon.
            </div>
            
            <p style="margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6366f1; font-size: 12px;">${setupLink}</p>
            
            <p style="margin-top: 30px;">If you didn't expect this email or have any questions, please contact your administrator.</p>
            
            <div class="footer">
              <p>This is an automated message from WorkToolsHub.</p>
              <p>© ${new Date().getFullYear()} WorkToolsHub. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = { sendAccountSetupEmail };
