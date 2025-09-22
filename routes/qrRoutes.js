const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");

const router = express.Router();

// Setup multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// POST /api/generate/qr-code
router.post("/qr-code", upload.single("file"), async (req, res) => {
  try {
    let targetText;

    // 1) File uploaded → use its URL
    if (req.file) {
      targetText = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
      console.log("File uploaded, using URL:", targetText);
    }
    // 2) JSON body → check "text" or "content"
    else if (req.body && (req.body.text || req.body.content)) {
      targetText = (req.body.text || req.body.content).trim();
      console.log("Using provided text/content:", targetText);
    }

    if (!targetText) {
      return res.status(400).json({ message: "Provide either a file or a text/URL" });
    }

    // Generate QR code as base64
    const size = parseInt(req.body.size) || 300;
    const qrBase64 = await QRCode.toDataURL(targetText, {
      width: size,
      margin: 2,
    });

    // ✅ Use `qrCodeUrl` so it matches frontend expectation
    res.json({ qrCodeUrl: qrBase64, target: targetText });
  } catch (err) {
    console.error("QR generation error:", err);
    res.status(500).json({ message: "Failed to generate QR code" });
  }
});

module.exports = router;
