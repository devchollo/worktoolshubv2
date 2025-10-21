// services/pdfCombinerService.js
const crypto = require('crypto');

class PDFCombinerService {
  constructor() {
    this.backblazeKeyId = process.env.BACKBLAZE_KEY_ID;
    this.backblazeAppKey = process.env.BACKBLAZE_APP_KEY;
    this.bucketName = process.env.BACKBLAZE_BUCKET_NAME;
    this.bucketId = process.env.BACKBLAZE_BUCKET_ID;
    this.authToken = null;
    this.apiUrl = null;
    this.downloadUrl = null;
  }

  /**
   * Combine multiple PDF files into one
   * Uses a simple approach that works with basic PDFs
   */
  async combinePDFs(files) {
    try {
      console.log(`🔧 Starting PDF combination for ${files.length} files`);

      // Validate all files are valid PDFs
      for (const file of files) {
        if (!this.isValidPDF(file.buffer)) {
          throw new Error(`Invalid PDF: ${file.originalname}`);
        }
      }

      // For simple PDF combination, we'll use a basic approach
      // In production, you might want to use pdf-lib or similar
      const combinedPdf = await this.simplePDFCombine(files);

      console.log(`✅ Combined PDF created: ${(combinedPdf.length / 1024 / 1024).toFixed(2)} MB`);
      return combinedPdf;

    } catch (error) {
      console.error('PDF combination error:', error);
      throw new Error(`Failed to combine PDFs: ${error.message}`);
    }
  }

  /**
   * Simple PDF combination using manual PDF structure
   * This is a basic implementation - for production use pdf-lib
   */
  async simplePDFCombine(files) {
    // Install pdf-lib for production: npm install pdf-lib
    // For now, we'll use a workaround that requires pdf-lib
    
    try {
      // Dynamic import of pdf-lib (you'll need to install it)
      const { PDFDocument } = require('pdf-lib');
      
      const mergedPdf = await PDFDocument.create();
      
      for (const file of files) {
        try {
          const pdf = await PDFDocument.load(file.buffer);
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } catch (error) {
          console.error(`Error processing ${file.originalname}:`, error);
          throw new Error(`Failed to process ${file.originalname}: ${error.message}`);
        }
      }
      
      const mergedPdfBytes = await mergedPdf.save();
      return Buffer.from(mergedPdfBytes);
      
    } catch (error) {
      if (error.message.includes('Cannot find module')) {
        throw new Error('PDF processing library not installed. Please install pdf-lib: npm install pdf-lib');
      }
      throw error;
    }
  }

  /**
   * Validate if buffer is a valid PDF
   */
  isValidPDF(buffer) {
    if (!buffer || buffer.length < 5) {
      return false;
    }

    // Check PDF header (%PDF-)
    const header = buffer.slice(0, 5).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      return false;
    }

    // Check for PDF EOF marker
    const end = buffer.slice(-50).toString('ascii');
    if (!end.includes('%%EOF')) {
      return false;
    }

    return true;
  }

  /**
   * Authenticate with Backblaze B2
   */
  async authenticate() {
    try {
      console.log('🔐 Authenticating with Backblaze...');
      
      const auth = Buffer.from(
        `${this.backblazeKeyId}:${this.backblazeAppKey}`
      ).toString('base64');

      const response = await fetch(
        'https://api.backblazeb2.com/b2api/v2/b2_authorize_account',
        {
          method: 'GET',
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Backblaze auth failed: ${response.status}`);
      }

      const data = await response.json();
      this.authToken = data.authorizationToken;
      this.apiUrl = data.apiUrl;
      this.downloadUrl = data.downloadUrl;

      console.log('✅ Backblaze authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Backblaze authentication error:', error);
      throw error;
    }
  }

  /**
   * Get upload URL from Backblaze
   */
  async getUploadUrl() {
    if (!this.authToken) {
      await this.authenticate();
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/b2api/v2/b2_get_upload_url`,
        {
          method: 'POST',
          headers: {
            Authorization: this.authToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bucketId: this.bucketId,
          }),
        }
      );

      if (!response.ok) {
        // Token might have expired, try re-authenticating
        if (response.status === 401) {
          console.log('🔄 Token expired, re-authenticating...');
          await this.authenticate();
          return this.getUploadUrl(); // Retry
        }
        throw new Error(`Get upload URL failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get upload URL error:', error);
      throw error;
    }
  }

  /**
   * Generate unique filename for combined PDF
   */
  generateFileName() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `combined_pdf_${timestamp}_${random}.pdf`;
  }

  /**
   * Upload combined PDF to Backblaze B2
   */
  async uploadToBackblaze(pdfBuffer) {
    try {
      console.log('📤 Uploading combined PDF to Backblaze...');

      const uploadData = await this.getUploadUrl();
      const fileName = this.generateFileName();

      // Calculate SHA1 hash
      const sha1Hash = crypto
        .createHash('sha1')
        .update(pdfBuffer)
        .digest('hex');

      const response = await fetch(uploadData.uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: uploadData.authorizationToken,
          'X-Bz-File-Name': encodeURIComponent(fileName),
          'Content-Type': 'application/pdf',
          'X-Bz-Content-Sha1': sha1Hash,
          'Content-Length': pdfBuffer.length,
        },
        body: pdfBuffer,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Upload failed:', errorBody);
        throw new Error(`Upload failed: ${response.status} - ${errorBody}`);
      }

      const result = await response.json();
      
      return {
        fileId: result.fileId,
        fileName: fileName,
        publicUrl: `${this.downloadUrl}/file/${this.bucketName}/${fileName}`,
        size: pdfBuffer.length,
      };

    } catch (error) {
      console.error('Backblaze upload error:', error);
      throw new Error(`Failed to upload to cloud storage: ${error.message}`);
    }
  }

  /**
   * Get file info from Backblaze
   */
  async getFileInfo(fileId) {
    if (!this.authToken) {
      await this.authenticate();
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/b2api/v2/b2_get_file_info`,
        {
          method: 'POST',
          headers: {
            Authorization: this.authToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fileId }),
        }
      );

      if (!response.ok) {
        throw new Error(`Get file info failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get file info error:', error);
      throw error;
    }
  }
}

module.exports = new PDFCombinerService();