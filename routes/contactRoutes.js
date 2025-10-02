const express = require("express");
const router = express.Router();
const { sendContactFormEmail } = require("../utils/contactEmailService");
const validator = require("validator");

router.post("/send", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        error: "Invalid email address",
      });
    }

    if (name.length > 100 || subject.length > 200 || message.length > 2000) {
      return res.status(400).json({
        error: "Input exceeds maximum length",
      });
    }

    const result = await sendContactFormEmail({
      name: validator.escape(name.trim()),
      email: email.trim(),
      subject: validator.escape(subject.trim()),
      message: validator.escape(message.trim()),
    });

    if (result.success) {
      res.json({
        success: true,
        message: "Message sent successfully",
      });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({
      error: "Failed to send message. Please try again later.",
    });
  }
});

module.exports = router;