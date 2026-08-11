import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// File storage configuration
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'; // 'local', 's3', 'cloudflare'
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024; // 100MB default
const UPLOAD_PATH = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads');

// Create upload directory structure with date-based organization
const createDirectories = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  const dirs = [
    UPLOAD_PATH,
    path.join(UPLOAD_PATH, 'profile'),
    path.join(UPLOAD_PATH, 'documents'),
    path.join(UPLOAD_PATH, 'temp'),
    path.join(UPLOAD_PATH, 'profile', year.toString()),
    path.join(UPLOAD_PATH, 'documents', year.toString()),
    path.join(UPLOAD_PATH, 'profile', year.toString(), month),
    path.join(UPLOAD_PATH, 'documents', year.toString(), month)
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createDirectories();

// Generate secure filename with hash
const generateSecureFilename = (originalname) => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalname).toLowerCase();
  const hash = crypto.createHash('md5').update(originalname + timestamp).digest('hex').substring(0, 8);
  return `${hash}-${timestamp}-${random}${ext}`;
};

// Get date-based path
const getDatePath = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return path.join(year.toString(), month);
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const datePath = getDatePath();
    let uploadDir;

    if (req.route.path.includes('profile') || file.fieldname === 'profileImage' || (file.fieldname === 'file' && req.params?.model === 'employees')) {
      uploadDir = path.join(UPLOAD_PATH, 'profile', datePath);
    } else {
      uploadDir = path.join(UPLOAD_PATH, 'documents', datePath);
    }

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const filename = generateSecureFilename(file.originalname);
    req.uploadedFileName = filename;
    cb(null, filename);
  }
});

// Enhanced file filter with size and type validation
const fileFilter = (req, file, cb) => {
  const allowedMimes = {
    // Images
    'image/jpeg': { maxSize: 10 * 1024 * 1024, category: 'image' }, // 10MB
    'image/jpg': { maxSize: 10 * 1024 * 1024, category: 'image' },
    'image/png': { maxSize: 10 * 1024 * 1024, category: 'image' },
    'image/gif': { maxSize: 5 * 1024 * 1024, category: 'image' }, // 5MB
    'image/webp': { maxSize: 10 * 1024 * 1024, category: 'image' },

    // Documents
    'application/pdf': { maxSize: 50 * 1024 * 1024, category: 'document' }, // 50MB
    'application/msword': { maxSize: 25 * 1024 * 1024, category: 'document' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { maxSize: 25 * 1024 * 1024, category: 'document' },
    'application/vnd.ms-excel': { maxSize: 25 * 1024 * 1024, category: 'document' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { maxSize: 25 * 1024 * 1024, category: 'document' },
    'text/plain': { maxSize: 10 * 1024 * 1024, category: 'document' },
    'text/csv': { maxSize: 25 * 1024 * 1024, category: 'document' },

    // Videos
    'video/mp4': { maxSize: 100 * 1024 * 1024, category: 'video' },
    'video/webm': { maxSize: 100 * 1024 * 1024, category: 'video' },
    'video/ogg': { maxSize: 100 * 1024 * 1024, category: 'video' },
    'video/quicktime': { maxSize: 100 * 1024 * 1024, category: 'video' },

    // Archives
    'application/zip': { maxSize: 100 * 1024 * 1024, category: 'archive' }, // 100MB
    'application/x-rar-compressed': { maxSize: 100 * 1024 * 1024, category: 'archive' }
  };

  const fileConfig = allowedMimes[file.mimetype];

  if (!fileConfig) {
    return cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }

  // Store file config for later size validation
  req.fileConfig = fileConfig;
  cb(null, true);
};

// Memory-efficient multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5, // Max 5 files per request
    fieldSize: 2 * 1024 * 1024 // 2MB field size
  },
  fileFilter: fileFilter
});

// Enhanced file upload handler with metadata
const handleFileUpload = (req, res, next) => {
  if (req.file) {
    const datePath = getDatePath();
    const folder = req.route.path.includes('profile') || req.file.fieldname === 'profileImage' ? 'profile' : 'documents';

    // Generate file metadata
    req.fileMetadata = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: `uploads/${folder}/${datePath}/${req.file.filename}`,
      url: `/api/files/serve/${folder}/${datePath}/${req.file.filename}`,
      uploadedAt: new Date(),
      hash: crypto.createHash('md5').update(fs.readFileSync(req.file.path)).digest('hex')
    };

    // Store in request for database saving
    req.filePath = req.fileMetadata.path;
  }
  next();
};

// File cleanup utility
const cleanupTempFiles = () => {
  const tempDir = path.join(UPLOAD_PATH, 'temp');
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  if (fs.existsSync(tempDir)) {
    fs.readdir(tempDir, (err, files) => {
      if (err) return;

      files.forEach(file => {
        const filePath = path.join(tempDir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) return;

          if (stats.mtime.getTime() < oneDayAgo) {
            fs.unlink(filePath, (err) => {
              if (!err) console.log(`Cleaned up temp file: ${file}`);
            });
          }
        });
      });
    });
  }
};

// Run cleanup every hour
setInterval(cleanupTempFiles, 60 * 60 * 1000);

export { upload, handleFileUpload, generateSecureFilename, getDatePath };