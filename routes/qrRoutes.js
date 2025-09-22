const express = require("express");
const multer = require("multer");
const fileUploadService = require("../services/fileUploadService");
const QRCode = require("qrcode");

const router = express.Router();

// Multer config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "audio/mpeg", "audio/wav", "audio/mp4", "audio/aac", "audio/ogg",
      "video/mp4", "video/webm", "video/avi", "video/quicktime",
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml",
    ];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  },
});

/**
 * POST /api/generate/qr-code
 * Accepts JSON { "text": "..." } or multipart/form-data with "file"
 */
router.post("/generate/qr-code", upload.single("file"), async (req, res) => {
  try {
    let targetText;

    if (req.file) {
      // File uploaded → store in Backblaze
      const result = await fileUploadService.uploadFile(req.file, req.file.originalname);
      targetText = result.publicUrl;
    } else if (req.body && (req.body.text || req.body.content)) {
      // Text/URL provided (support both `text` and `content` for safety)
      targetText = (req.body.text || req.body.content).trim();
    } else {
      return res.status(400).json({
        error: "Invalid input",
        message: "Provide either a file or a text/URL",
      });
    }

    const size = parseInt(req.body.size, 10) || 300;

    const pngBuffer = await QRCode.toBuffer(targetText, {
      type: "png",
      width: size,
      margin: 2,
    });

    // Respond with base64 data URI
    const qrBase64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;
    res.json({ qrCodeUrl: qrBase64, target: targetText });
  } catch (error) {
    console.error("❌ QR code generation error:", error);
    res.status(500).json({
      error: "QR code generation failed",
      message: error.message,
    });
  }
});

module.exports = router;
