// services/fileConversionService.js - UPDATED VERSION
// Enhanced document conversion without LibreOffice requirement

const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class FileConversionService {
  constructor() {
    this.supportedConversions = {
      image: {
        from: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'bmp', 'tiff', 'ico', 'heic', 'avif'],
        to: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'ico', 'avif']
      },
      audio: {
        from: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma', 'opus'],
        to: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus']
      },
      video: {
        from: ['mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm', 'm4v', 'mpeg', 'mpg'],
        to: ['mp4', 'avi', 'mov', 'mkv', 'webm', 'm4v', 'mpeg']
      },
      document: {
        // Only include conversions that work without LibreOffice
        from: ['pdf', 'txt', 'html', 'md', 'docx'],
        to: ['pdf', 'txt', 'html', 'md']
      }
    };

    this.tempDir = path.join(__dirname, '../temp');
    this.ensureTempDir();
  }

  // Ensure temp directory exists
  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  // Get supported conversions
  getSupportedConversions() {
    return this.supportedConversions;
  }

  // Detect file type from extension
  detectFileType(format) {
    format = format.toLowerCase();
    for (const [type, formats] of Object.entries(this.supportedConversions)) {
      if (formats.from.includes(format) || formats.to.includes(format)) {
        return type;
      }
    }
    return null;
  }

  // Validate if conversion is supported
  isConversionSupported(fromFormat, toFormat) {
    fromFormat = fromFormat.toLowerCase();
    toFormat = toFormat.toLowerCase();
    
    const fileType = this.detectFileType(fromFormat);
    if (!fileType) return false;
    
    const conversions = this.supportedConversions[fileType];
    return conversions.from.includes(fromFormat) && conversions.to.includes(toFormat);
  }

  // Main conversion router
  async convert(inputBuffer, fromFormat, toFormat, options = {}) {
    const fileType = this.detectFileType(fromFormat);
    
    if (!fileType) {
      throw new Error(`Unsupported file format: ${fromFormat}`);
    }

    switch (fileType) {
      case 'image':
        return await this.convertImage(inputBuffer, fromFormat, toFormat, options);
      case 'audio':
        return await this.convertAudio(inputBuffer, fromFormat, toFormat, options);
      case 'video':
        return await this.convertVideo(inputBuffer, fromFormat, toFormat, options);
      case 'document':
        return await this.convertDocument(inputBuffer, fromFormat, toFormat, options);
      default:
        throw new Error(`Conversion not supported for file type: ${fileType}`);
    }
  }

  // ==================== IMAGE CONVERSIONS ====================
  async convertImage(inputBuffer, fromFormat, toFormat, options = {}) {
    try {
      if (!this.isConversionSupported(fromFormat, toFormat)) {
        throw new Error(`Conversion from ${fromFormat} to ${toFormat} is not supported`);
      }

      let sharpInstance = sharp(inputBuffer);

      const quality = options.quality || 90;
      const resize = options.resize || null;

      if (resize) {
        sharpInstance = sharpInstance.resize({
          width: resize.width || null,
          height: resize.height || null,
          fit: resize.fit || 'inside',
          withoutEnlargement: true
        });
      }

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
        case 'avif':
          sharpInstance = sharpInstance.avif({ quality });
          break;
        case 'ico':
          sharpInstance = sharpInstance.resize(256, 256).png();
          break;
        default:
          throw new Error(`Unsupported output format: ${toFormat}`);
      }

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

  // ==================== AUDIO CONVERSIONS ====================
  async convertAudio(inputBuffer, fromFormat, toFormat, options = {}) {
    const tempInputPath = path.join(this.tempDir, `input_${crypto.randomBytes(8).toString('hex')}.${fromFormat}`);
    const tempOutputPath = path.join(this.tempDir, `output_${crypto.randomBytes(8).toString('hex')}.${toFormat}`);

    try {
      await fs.writeFile(tempInputPath, inputBuffer);

      const bitrate = options.bitrate || '192k';
      const sampleRate = options.sampleRate || 44100;
      const channels = options.channels || 2;

      let command = `ffmpeg -i "${tempInputPath}" -b:a ${bitrate} -ar ${sampleRate} -ac ${channels}`;

      switch (toFormat.toLowerCase()) {
        case 'mp3':
          command += ` -codec:a libmp3lame -q:a 2`;
          break;
        case 'ogg':
        case 'opus':
          command += ` -codec:a libopus`;
          break;
        case 'aac':
        case 'm4a':
          command += ` -codec:a aac`;
          break;
        case 'flac':
          command += ` -codec:a flac`;
          break;
        case 'wav':
          command += ` -codec:a pcm_s16le`;
          break;
      }

      command += ` -y "${tempOutputPath}"`;

      await execPromise(command);

      const outputBuffer = await fs.readFile(tempOutputPath);
      const metadata = await this.getAudioMetadata(tempOutputPath);

      return {
        buffer: outputBuffer,
        format: toFormat,
        size: outputBuffer.length,
        metadata
      };

    } catch (error) {
      console.error('Audio conversion error:', error);
      throw new Error(`Failed to convert audio: ${error.message}`);
    } finally {
      try {
        await fs.unlink(tempInputPath).catch(() => {});
        await fs.unlink(tempOutputPath).catch(() => {});
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
  }

  async getAudioMetadata(filePath) {
    try {
      const { stdout } = await execPromise(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
      );
      const data = JSON.parse(stdout);
      
      const audioStream = data.streams.find(s => s.codec_type === 'audio');
      
      return {
        duration: parseFloat(data.format.duration),
        bitrate: parseInt(data.format.bit_rate),
        sampleRate: audioStream ? parseInt(audioStream.sample_rate) : null,
        channels: audioStream ? audioStream.channels : null,
        codec: audioStream ? audioStream.codec_name : null
      };
    } catch (error) {
      console.error('Audio metadata extraction error:', error);
      return null;
    }
  }

  // ==================== VIDEO CONVERSIONS ====================
  async convertVideo(inputBuffer, fromFormat, toFormat, options = {}) {
    const tempInputPath = path.join(this.tempDir, `input_${crypto.randomBytes(8).toString('hex')}.${fromFormat}`);
    const tempOutputPath = path.join(this.tempDir, `output_${crypto.randomBytes(8).toString('hex')}.${toFormat}`);

    try {
      await fs.writeFile(tempInputPath, inputBuffer);

      const videoBitrate = options.videoBitrate || '1000k';
      const audioBitrate = options.audioBitrate || '128k';
      const resolution = options.resolution || null;
      const fps = options.fps || null;

      let command = `ffmpeg -i "${tempInputPath}"`;

      switch (toFormat.toLowerCase()) {
        case 'mp4':
          command += ` -codec:v libx264 -preset medium`;
          break;
        case 'webm':
          command += ` -codec:v libvpx-vp9`;
          break;
        case 'avi':
          command += ` -codec:v mpeg4`;
          break;
        case 'mkv':
          command += ` -codec:v libx264`;
          break;
        default:
          command += ` -codec:v libx264`;
      }

      command += ` -b:v ${videoBitrate} -codec:a aac -b:a ${audioBitrate}`;

      if (resolution) {
        command += ` -vf scale=${resolution}`;
      }

      if (fps) {
        command += ` -r ${fps}`;
      }

      command += ` -y "${tempOutputPath}"`;

      await execPromise(command, { timeout: 300000 });

      const outputBuffer = await fs.readFile(tempOutputPath);
      const metadata = await this.getVideoMetadata(tempOutputPath);

      return {
        buffer: outputBuffer,
        format: toFormat,
        size: outputBuffer.length,
        metadata
      };

    } catch (error) {
      console.error('Video conversion error:', error);
      throw new Error(`Failed to convert video: ${error.message}`);
    } finally {
      try {
        await fs.unlink(tempInputPath).catch(() => {});
        await fs.unlink(tempOutputPath).catch(() => {});
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
  }

  async getVideoMetadata(filePath) {
    try {
      const { stdout } = await execPromise(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
      );
      const data = JSON.parse(stdout);
      
      const videoStream = data.streams.find(s => s.codec_type === 'video');
      const audioStream = data.streams.find(s => s.codec_type === 'audio');
      
      return {
        duration: parseFloat(data.format.duration),
        bitrate: parseInt(data.format.bit_rate),
        width: videoStream ? videoStream.width : null,
        height: videoStream ? videoStream.height : null,
        fps: videoStream ? eval(videoStream.r_frame_rate) : null,
        videoCodec: videoStream ? videoStream.codec_name : null,
        audioCodec: audioStream ? audioStream.codec_name : null
      };
    } catch (error) {
      console.error('Video metadata extraction error:', error);
      return null;
    }
  }

  // ==================== DOCUMENT CONVERSIONS (NO LIBREOFFICE) ====================
  async convertDocument(inputBuffer, fromFormat, toFormat, options = {}) {
    try {
      // PDF to Text
      if (fromFormat === 'pdf' && toFormat === 'txt') {
        return await this.pdfToText(inputBuffer);
      }

      // PDF to HTML
      if (fromFormat === 'pdf' && toFormat === 'html') {
        return await this.pdfToHtml(inputBuffer);
      }

      // Text to PDF
      if (fromFormat === 'txt' && toFormat === 'pdf') {
        return await this.textToPdf(inputBuffer, options);
      }

      // Markdown to HTML
      if (fromFormat === 'md' && toFormat === 'html') {
        return await this.markdownToHtml(inputBuffer);
      }

      // Markdown to PDF
      if (fromFormat === 'md' && toFormat === 'pdf') {
        const htmlResult = await this.markdownToHtml(inputBuffer);
        return await this.htmlToPdf(htmlResult.buffer);
      }

      // HTML to Markdown
      if (fromFormat === 'html' && toFormat === 'md') {
        return await this.htmlToMarkdown(inputBuffer);
      }

      // HTML to PDF
      if (fromFormat === 'html' && toFormat === 'pdf') {
        return await this.htmlToPdf(inputBuffer);
      }

      // HTML to Text
      if (fromFormat === 'html' && toFormat === 'txt') {
        return await this.htmlToText(inputBuffer);
      }

      // DOCX to Text (using mammoth)
      if (fromFormat === 'docx' && toFormat === 'txt') {
        return await this.docxToText(inputBuffer);
      }

      // DOCX to HTML
      if (fromFormat === 'docx' && toFormat === 'html') {
        return await this.docxToHtml(inputBuffer);
      }

      // DOCX to Markdown
      if (fromFormat === 'docx' && toFormat === 'md') {
        const htmlResult = await this.docxToHtml(inputBuffer);
        return await this.htmlToMarkdown(htmlResult.buffer);
      }

      throw new Error(`Conversion from ${fromFormat} to ${toFormat} requires LibreOffice, which is not installed`);

    } catch (error) {
      console.error('Document conversion error:', error);
      throw new Error(`Failed to convert document: ${error.message}`);
    }
  }

  // PDF to Text conversion
  async pdfToText(inputBuffer) {
    const pdfParse = require('pdf-parse');
    
    try {
      const data = await pdfParse(inputBuffer);
      const textBuffer = Buffer.from(data.text, 'utf-8');

      return {
        buffer: textBuffer,
        format: 'txt',
        size: textBuffer.length,
        metadata: {
          pages: data.numpages,
          info: data.info
        }
      };
    } catch (error) {
      throw new Error(`PDF to text conversion failed: ${error.message}`);
    }
  }

  // PDF to HTML (extract text and wrap in HTML)
  async pdfToHtml(inputBuffer) {
    const pdfParse = require('pdf-parse');
    
    try {
      const data = await pdfParse(inputBuffer);
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Converted PDF</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      max-width: 800px; 
      margin: 40px auto; 
      padding: 20px; 
      line-height: 1.6;
      background: #f5f5f5;
    }
    .page {
      background: white;
      padding: 40px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    pre { white-space: pre-wrap; word-wrap: break-word; }
  </style>
</head>
<body>
  <div class="page">
    <pre>${this.escapeHtml(data.text)}</pre>
  </div>
</body>
</html>`;

      const htmlBuffer = Buffer.from(html, 'utf-8');

      return {
        buffer: htmlBuffer,
        format: 'html',
        size: htmlBuffer.length,
        metadata: {
          pages: data.numpages
        }
      };
    } catch (error) {
      throw new Error(`PDF to HTML conversion failed: ${error.message}`);
    }
  }

  // Text to PDF conversion
  async textToPdf(inputBuffer, options = {}) {
    const PDFDocument = require('pdfkit');
    const { PassThrough } = require('stream');

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.pageSize || 'A4',
          margin: 50
        });
        const stream = new PassThrough();
        const chunks = [];

        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            buffer,
            format: 'pdf',
            size: buffer.length,
            metadata: null
          });
        });
        stream.on('error', reject);

        doc.pipe(stream);

        const text = inputBuffer.toString('utf-8');
        
        // Add header
        doc.fontSize(20).text('Document', { align: 'center' });
        doc.moveDown();
        
        // Add content
        doc.fontSize(12).text(text, {
          align: 'left',
          lineGap: 4
        });

        doc.end();
      } catch (error) {
        reject(new Error(`Text to PDF conversion failed: ${error.message}`));
      }
    });
  }

  // HTML to PDF conversion
  async htmlToPdf(inputBuffer) {
    const PDFDocument = require('pdfkit');
    const { PassThrough } = require('stream');

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });
        const stream = new PassThrough();
        const chunks = [];

        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            buffer,
            format: 'pdf',
            size: buffer.length,
            metadata: null
          });
        });
        stream.on('error', reject);

        doc.pipe(stream);

        // Strip HTML tags and convert to plain text
        let html = inputBuffer.toString('utf-8');
        let text = html
          .replace(/<head>[\s\S]*?<\/head>/gi, '')
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        doc.fontSize(12).text(text, {
          align: 'left',
          lineGap: 4
        });

        doc.end();
      } catch (error) {
        reject(new Error(`HTML to PDF conversion failed: ${error.message}`));
      }
    });
  }

  // HTML to Text
  async htmlToText(inputBuffer) {
    const html = inputBuffer.toString('utf-8');
    
    let text = html
      .replace(/<head>[\s\S]*?<\/head>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .trim();

    const textBuffer = Buffer.from(text, 'utf-8');

    return {
      buffer: textBuffer,
      format: 'txt',
      size: textBuffer.length,
      metadata: null
    };
  }

  // Markdown to HTML conversion
  async markdownToHtml(inputBuffer) {
    const markdown = inputBuffer.toString('utf-8');
    
    // Simple markdown parser (you can use 'marked' package if available)
    let html = markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" />')
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
      .replace(/\n\n/gim, '</p><p>')
      .replace(/\n/gim, '<br />');

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Converted Document</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      max-width: 800px; 
      margin: 40px auto; 
      padding: 20px; 
      line-height: 1.6;
      color: #333;
    }
    code { 
      background: #f4f4f4; 
      padding: 2px 6px; 
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    pre { 
      background: #f4f4f4; 
      padding: 15px; 
      border-radius: 5px; 
      overflow-x: auto;
      border-left: 3px solid #3b82f6;
    }
    h1, h2, h3 { 
      margin-top: 24px; 
      margin-bottom: 16px;
      font-weight: 600;
    }
    h1 { font-size: 2em; border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; }
    h3 { font-size: 1.25em; }
    a { color: #3b82f6; text-decoration: none; }
    a:hover { text-decoration: underline; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <p>${html}</p>
</body>
</html>`;

    const htmlBuffer = Buffer.from(fullHtml, 'utf-8');

    return {
      buffer: htmlBuffer,
      format: 'html',
      size: htmlBuffer.length,
      metadata: null
    };
  }

  // HTML to Markdown
  async htmlToMarkdown(inputBuffer) {
    const html = inputBuffer.toString('utf-8');
    
    let markdown = html
      .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i>(.*?)<\/i>/gi, '*$1*')
      .replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<img.*?src="(.*?)".*?alt="(.*?)".*?\/?>/gi, '![$2]($1)')
      .replace(/<code>(.*?)<\/code>/gi, '`$1`')
      .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();

    const markdownBuffer = Buffer.from(markdown, 'utf-8');

    return {
      buffer: markdownBuffer,
      format: 'md',
      size: markdownBuffer.length,
      metadata: null
    };
  }

  // DOCX to Text using Mammoth
  async docxToText(inputBuffer) {
    const mammoth = require('mammoth');
    
    try {
      const result = await mammoth.extractRawText({ buffer: inputBuffer });
      const textBuffer = Buffer.from(result.value, 'utf-8');

      return {
        buffer: textBuffer,
        format: 'txt',
        size: textBuffer.length,
        metadata: {
          messages: result.messages
        }
      };
    } catch (error) {
      throw new Error(`DOCX to text conversion failed: ${error.message}`);
    }
  }

  // DOCX to HTML using Mammoth
  async docxToHtml(inputBuffer) {
    const mammoth = require('mammoth');
    
    try {
      const result = await mammoth.convertToHtml({ buffer: inputBuffer });
      
      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Converted Document</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      max-width: 800px; 
      margin: 40px auto; 
      padding: 20px; 
      line-height: 1.6;
    }
  </style>
</head>
<body>
  ${result.value}
</body>
</html>`;

      const htmlBuffer = Buffer.from(fullHtml, 'utf-8');

      return {
        buffer: htmlBuffer,
        format: 'html',
        size: htmlBuffer.length,
        metadata: {
          messages: result.messages
        }
      };
    } catch (error) {
      throw new Error(`DOCX to HTML conversion failed: ${error.message}`);
    }
  }

  // Helper to escape HTML
  escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ==================== UTILITY METHODS ====================

  async batchConvert(files, toFormat, options = {}) {
    const results = [];

    for (const file of files) {
      try {
        const fromFormat = path.extname(file.originalname).slice(1).toLowerCase();
        
        const converted = await this.convert(
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

  async optimizeImage(inputBuffer, format, options = {}) {
    try {
      const quality = options.quality || 80;
      let sharpInstance = sharp(inputBuffer);

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

  async detectFormat(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      return metadata.format;
    } catch (error) {
      return null;
    }
  }

  async checkFFmpegAvailability() {
    try {
      await execPromise('ffmpeg -version');
      return true;
    } catch (error) {
      return false;
    }
  }

  async checkLibreOfficeAvailability() {
    try {
      await execPromise('libreoffice --version');
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new FileConversionService();