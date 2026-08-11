import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import stream from 'stream';
import crypto from 'node:crypto';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pipeline = promisify(stream.pipeline);

const router = express.Router();
const UPLOAD_PATH = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads');
const CDN_URL = process.env.CDN_URL || null;
// On-disk thumbnail cache directory (next to uploads)
const CACHE_PATH = path.join(UPLOAD_PATH, '_cache');
if (!fs.existsSync(CACHE_PATH)) fs.mkdirSync(CACHE_PATH, { recursive: true });

// Enhanced file serving with CDN support, on-demand resize, and streaming
router.get('/serve/:folder/:year/:month/:filename', async (req, res) => {
  try {
    const { folder, year, month, filename } = req.params;

    // If CDN is configured, redirect to CDN
    if (CDN_URL) {
      const cdnUrl = `${CDN_URL}/${folder}/${year}/${month}/${filename}`;
      return res.redirect(302, cdnUrl);
    }

    const filePath = path.join(UPLOAD_PATH, folder, year, month, filename);

    // Security check - ensure file is within upload directory
    const resolvedPath = path.resolve(filePath);
    const uploadDir = path.resolve(UPLOAD_PATH);
    if (!resolvedPath.startsWith(uploadDir)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();

    // MIME type mapping
    const mimeTypes = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
      '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip', '.rar': 'application/x-rar-compressed'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // On-demand image resize: ?w=200&q=80
    // Only applies to images; all other file types skip directly to streaming.
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    const { w, q } = req.query;

    if (isImage && w) {
      const width = Math.min(parseInt(w, 10), 3000); // cap at 3000px
      const quality = Math.min(parseInt(q || '80', 10), 100);
      const cacheKey = `${folder}_${year}_${month}_${width}w_${quality}q_${filename}.webp`;
      const cachePath = path.join(CACHE_PATH, cacheKey);

      // Serve already-cached thumbnail instantly
      if (fs.existsSync(cachePath)) {
        const cacheStat = fs.statSync(cachePath);
        const cacheEtag = `"${cacheStat.mtime.getTime()}-${cacheStat.size}"`;
        if (req.headers['if-none-match'] === cacheEtag) return res.status(304).end();
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Content-Length', cacheStat.size);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('ETag', cacheEtag);
        res.setHeader('X-Image-Source', 'cache');
        return fs.createReadStream(cachePath).pipe(res);
      }

      // Generate thumbnail on-the-fly, save to cache, then serve
      try {
        await sharp(filePath)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality })
          .toFile(cachePath);

        const cacheStat = fs.statSync(cachePath);
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('Content-Length', cacheStat.size);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('ETag', `"${cacheStat.mtime.getTime()}-${cacheStat.size}"`);
        res.setHeader('X-Image-Source', 'generated');
        return fs.createReadStream(cachePath).pipe(res);
      } catch (sharpError) {
        console.warn('[FileServe] sharp resize failed, falling back to original:', sharpError.message);
        // Fall through to serve original below
      }
    }

    // Standard file serving — original quality (or non-image fallback)
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    // immutable tells the browser this URL's content will NEVER change (use versioned URLs for updates)
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('ETag', `"${stat.mtime.getTime()}-${stat.size}"`);

    // Check if client has cached version
    const ifNoneMatch = req.headers['if-none-match'];
    const etag = `"${stat.mtime.getTime()}-${stat.size}"`;
    if (ifNoneMatch === etag) {
      return res.status(304).end();
    }

    const stream = fs.createReadStream(filePath);
    await pipeline(stream, res);

  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ success: false, message: 'Error serving file' });
  }
});

// Legacy route support
router.get('/render/:folder/:filename', (req, res) => {
  const { folder, filename } = req.params;
  // Try to find file in current year/month structure
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  res.redirect(`/api/files/serve/${folder}/${year}/${month}/${filename}`);
});

// File metadata and info
router.get('/info/:folder/:year/:month/:filename', (req, res) => {
  try {
    const { folder, year, month, filename } = req.params;
    const filePath = path.join(UPLOAD_PATH, folder, year, month, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(filename);

    // Generate file hash for integrity check
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('md5').update(fileBuffer).digest('hex');

    res.json({
      success: true,
      data: {
        filename,
        originalPath: `${folder}/${year}/${month}/${filename}`,
        size: stat.size,
        sizeFormatted: formatFileSize(stat.size),
        extension: ext,
        hash,
        created: stat.birthtime,
        modified: stat.mtime,
        url: CDN_URL ? `${CDN_URL}/${folder}/${year}/${month}/${filename}` : `/api/files/serve/${folder}/${year}/${month}/${filename}`
      }
    });

  } catch (error) {
    console.error('Error getting file info:', error);
    res.status(500).json({ success: false, message: 'Error getting file info' });
  }
});

// File upload endpoint with chunked upload support
router.post('/upload/chunk', (req, res) => {
  const { chunkIndex, totalChunks, filename, fileId } = req.body;
  const chunk = req.files?.chunk;

  if (!chunk) {
    return res.status(400).json({ success: false, message: 'No chunk provided' });
  }

  const tempDir = path.join(UPLOAD_PATH, 'temp', fileId);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const chunkPath = path.join(tempDir, `chunk-${chunkIndex}`);

  chunk.mv(chunkPath, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to save chunk' });
    }

    // Check if all chunks are uploaded
    const uploadedChunks = fs.readdirSync(tempDir).length;

    if (uploadedChunks === parseInt(totalChunks)) {
      // Combine chunks
      combineChunks(tempDir, filename, totalChunks)
        .then(finalPath => {
          res.json({ success: true, path: finalPath, completed: true });
        })
        .catch(error => {
          res.status(500).json({ success: false, message: 'Failed to combine chunks' });
        });
    } else {
      res.json({ success: true, completed: false, uploadedChunks });
    }
  });
});

// Storage usage statistics
router.get('/stats', (req, res) => {
  try {
    const stats = getStorageStats(UPLOAD_PATH);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error getting storage stats' });
  }
});

// Helper functions
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function combineChunks(tempDir, filename, totalChunks) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const finalDir = path.join(UPLOAD_PATH, 'documents', year.toString(), month);

  if (!fs.existsSync(finalDir)) {
    fs.mkdirSync(finalDir, { recursive: true });
  }

  const finalPath = path.join(finalDir, filename);
  const writeStream = fs.createWriteStream(finalPath);

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(tempDir, `chunk-${i}`);
    const chunkBuffer = fs.readFileSync(chunkPath);
    writeStream.write(chunkBuffer);
  }

  writeStream.end();

  // Cleanup temp directory
  fs.rmSync(tempDir, { recursive: true });

  return `documents/${year}/${month}/${filename}`;
}

function getStorageStats(uploadPath) {
  let totalSize = 0;
  let fileCount = 0;

  function scanDirectory(dir) {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        scanDirectory(itemPath);
      } else {
        totalSize += stat.size;
        fileCount++;
      }
    });
  }

  if (fs.existsSync(uploadPath)) {
    scanDirectory(uploadPath);
  }

  return {
    totalSize,
    totalSizeFormatted: formatFileSize(totalSize),
    fileCount,
    averageFileSize: fileCount > 0 ? Math.round(totalSize / fileCount) : 0
  };
}

export default router;