// services/fileUploadService.js
const crypto = require('crypto');

class FileUploadService {
  constructor() {
    this.backblazeKeyId = process.env.BACKBLAZE_KEY_ID;
    this.backblazeAppKey = process.env.BACKBLAZE_APP_KEY;
    this.bucketName = process.env.BACKBLAZE_BUCKET_NAME;
    this.bucketId = process.env.BACKBLAZE_BUCKET_ID;
    this.authToken = null;
    this.apiUrl = null;
    this.downloadUrl = null;
  }

  async authenticate() {
    try {
      const auth = Buffer.from(`${this.backblazeKeyId}:${this.backblazeAppKey}`).toString('base64');
      
      const response = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`
        }
      });

      if (!response.ok) {
        throw new Error(`Backblaze auth failed: ${response.status}`);
      }

      const data = await response.json();
      this.authToken = data.authorizationToken;
      this.apiUrl = data.apiUrl;
      this.downloadUrl = data.downloadUrl;
      
      return true;
    } catch (error) {
      console.error('Backblaze authentication error:', error);
      throw error;
    }
  }

  async getUploadUrl() {
    if (!this.authToken) {
      await this.authenticate();
    }

    try {
      const response = await fetch(`${this.apiUrl}/b2api/v2/b2_get_upload_url`, {
        method: 'POST',
        headers: {
          'Authorization': this.authToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bucketId: this.bucketId
        })
      });

      if (!response.ok) {
        throw new Error(`Get upload URL failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get upload URL error:', error);
      throw error;
    }
  }

  generateFileName(originalName) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = originalName.split('.').pop();
    return `embed_${timestamp}_${random}.${ext}`;
  }

  async uploadFile(file, originalName) {
    try {
      const uploadData = await this.getUploadUrl();
      const fileName = this.generateFileName(originalName);

      const response = await fetch(uploadData.uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': uploadData.authorizationToken,
          'X-Bz-File-Name': encodeURIComponent(fileName),
          'Content-Type': file.mimetype || 'application/octet-stream',
          'X-Bz-Content-Sha1': 'unverified'
        },
        body: file.buffer
      });

      if (!response.ok) {
        throw new Error(`File upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        fileId: result.fileId,
        fileName: fileName,
        publicUrl: `${this.downloadUrl}/file/${this.bucketName}/${fileName}`,
        size: file.size
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }
}

module.exports = new FileUploadService();