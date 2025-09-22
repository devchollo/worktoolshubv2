const express = require("express");
const multer = require("multer");
const QRCode = require("qrcode");
const fileUploadService = require("../services/fileUploadService");

const router = express.Router();

// Multer config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "audio/mpeg", "audio/wav", "audio/mp4", "audio/aac", "audio/ogg",
      "video/mp4", "video/webm", "video/avi", "video/quicktime",
      "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"
    ];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  },
});

/**
 * POST /api/generate/qr-code
 * Accepts: file OR text/URL
 * Returns: Base64 JSON (default) OR downloadable PNG if ?download=true
 */
router.post("/generate/qr-code", upload.single("file"), async (req, res) => {
  try {
    let targetText;

    if (req.file) {
      // Case 1: File uploaded → store in Backblaze
      const result = await fileUploadService.uploadFile(req.file, req.file.originalname);
      targetText = result.publicUrl;
      console.log("📦 Uploaded for QR:", targetText);
    } else if (req.body.text) {
      // Case 2: Direct text/URL provided
      targetText = req.body.text.trim();
    } else {
      return res.status(400).json({
        error: "Invalid input",
        message: "Provide either a file or a text/URL",
      });
    }

    const size = parseInt(req.body.size, 10) || 300;
    const download = req.query.download === "true";

    // Generate QR code as PNG buffer
    const pngBuffer = await QRCode.toBuffer(targetText, {
      width: size,
      margin: 2,
    });

    if (download) {
      // Serve file for download
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", `attachment; filename="qr-code.png"`);
      return res.send(pngBuffer);
    }

    // Default: return Base64 JSON
    const qrBase64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;
    res.json({ qrCode: qrBase64, target: targetText });

  } catch (error) {
    console.error("❌ QR code generation error:", error);
    res.status(500).json({
      error: "QR code generation failed",
      message: error.message,
    });
  }
});

module.exports = router;
