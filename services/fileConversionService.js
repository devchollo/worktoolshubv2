// services/fileConversionService.js
const sharp = require('sharp'); // For image conversions
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class FileConversionService {
  constructor() {
    this.supportedConversions = {
      image: {
        from: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'tiff'],
        to: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff']
      },
      // Future support for audio/video/documents can be added here
    };
  }

  // Get supported conversions
  getSupportedConversions() {
    return this.supportedConversions;
  }

  // Validate if conversion is supported
  isConversionSupported(fromFormat, toFormat, fileType = 'image') {
    const conversions = this.supportedConversions[fileType];
    if (!conversions) return false;
    
    return conversions.from.includes(fromFormat.toLowerCase()) && 
           conversions.to.includes(toFormat.toLowerCase());
  }

  // Convert image format
  async convertImage(inputBuffer, fromFormat, toFormat, options = {}) {
    try {
      // Validate conversion
      if (!this.isConversionSupported(fromFormat, toFormat, 'image')) {
        throw new Error(`Conversion from ${fromFormat} to ${toFormat} is not supported`);
      }

      let sharpInstance = sharp(inputBuffer);

      // Apply quality settings
      const quality = options.quality || 90;
      const resize = options.resize || null;

      // Apply resize if specified
      if (resize) {
        sharpInstance = sharpInstance.resize({
          width: resize.width || null,
          height: resize.height || null,
          fit: resize.fit || 'inside',
          withoutEnlargement: true
        });
      }

      // Convert based on target format
      switch (toFormat.toLowerCase()) {
        case 'jpg':
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ 
            quality,
            compressionLevel: options.compressionLevel || 6 
          });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality });
          break;
        case 'gif':
          sharpInstance = sharpInstance.gif();
          break;
        case 'bmp':
          sharpInstance = sharpInstance.bmp();
          break;
        case 'tiff':
          sharpInstance = sharpInstance.tiff({ quality });
          break;
        default:
          throw new Error(`Unsupported output format: ${toFormat}`);
      }

      // Get converted buffer
      const outputBuffer = await sharpInstance.toBuffer();

      return {
        buffer: outputBuffer,
        format: toFormat,
        size: outputBuffer.length,
        metadata: await this.getImageMetadata(outputBuffer)
      };
    } catch (error) {
      console.error('Image conversion error:', error);
      throw new Error(`Failed to convert image: ${error.message}`);
    }
  }

  // Get image metadata
  async getImageMetadata(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        hasAlpha: metadata.hasAlpha
      };
    } catch (error) {
      console.error('Metadata extraction error:', error);
      return null;
    }
  }

  // Batch convert multiple files
  async batchConvert(files, toFormat, options = {}) {
    const results = [];

    for (const file of files) {
      try {
        const fromFormat = path.extname(file.originalname).slice(1).toLowerCase();
        
        const converted = await this.convertImage(
          file.buffer,
          fromFormat,
          toFormat,
          options
        );

        results.push({
          success: true,
          originalName: file.originalname,
          convertedFormat: toFormat,
          originalSize: file.size,
          convertedSize: converted.size,
          metadata: converted.metadata,
          buffer: converted.buffer
        });
      } catch (error) {
        results.push({
          success: false,
          originalName: file.originalname,
          error: error.message
        });
      }
    }

    return results;
  }

  // Optimize image (compress without format change)
  async optimizeImage(inputBuffer, format, options = {}) {
    try {
      const quality = options.quality || 80;
      let sharpInstance = sharp(inputBuffer);

      // Apply optimization based on format
      switch (format.toLowerCase()) {
        case 'jpg':
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ 
            quality,
            progressive: true,
            mozjpeg: true
          });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ 
            quality,
            compressionLevel: 9,
            progressive: true
          });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ 
            quality,
            lossless: false
          });
          break;
        default:
          throw new Error(`Optimization not supported for format: ${format}`);
      }

      const outputBuffer = await sharpInstance.toBuffer();

      return {
        buffer: outputBuffer,
        originalSize: inputBuffer.length,
        optimizedSize: outputBuffer.length,
        compressionRatio: ((1 - outputBuffer.length / inputBuffer.length) * 100).toFixed(2)
      };
    } catch (error) {
      console.error('Image optimization error:', error);
      throw new Error(`Failed to optimize image: ${error.message}`);
    }
  }

  // Generate thumbnail
  async generateThumbnail(inputBuffer, options = {}) {
    try {
      const width = options.width || 200;
      const height = options.height || 200;
      const fit = options.fit || 'cover';

      const outputBuffer = await sharp(inputBuffer)
        .resize(width, height, { fit })
        .jpeg({ quality: 80 })
        .toBuffer();

      return outputBuffer;
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      throw new Error(`Failed to generate thumbnail: ${error.message}`);
    }
  }

  // Get file format from buffer
  async detectFormat(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      return metadata.format;
    } catch (error) {
      return null;
    }
  }
}

module.exports = new FileConversionService();