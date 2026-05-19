import multer        from 'multer';
import path          from 'path';
import fs            from 'fs';
import { v4 as uuid } from 'uuid';
import AppError      from '../utils/AppError.js';

// ─── Ensure upload directories exist ─────────────────────────────────────────
const UPLOAD_BASE = 'uploads';

const DIRS = {
  medical:    `${UPLOAD_BASE}/medical`,
  lab:        `${UPLOAD_BASE}/lab`,
  avatars:    `${UPLOAD_BASE}/avatars`,
  banner:     `${UPLOAD_BASE}/banners`,
  department: `${UPLOAD_BASE}/departments`,
};

Object.values(DIRS).forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Allowed MIME types per upload category ───────────────────────────────────
const ALLOWED_MIMES = {
  medical: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
  lab: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/tiff',
  ],
  avatar: [
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
  banner: [
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
  department: [
    'image/jpeg',
    'image/png',
    'image/webp',
  ],
};

// ─── Max file sizes (bytes) ───────────────────────────────────────────────────
const MAX_SIZES = {
  medical: 10 * 1024 * 1024,   // 10 MB
  lab:     20 * 1024 * 1024,   // 20 MB
  avatar:   2 * 1024 * 1024,   //  2 MB
  banner:   8 * 1024 * 1024,   //  8 MB
  department: 8 * 1024 * 1024, //  8 MB
};

// ─── Storage factory ──────────────────────────────────────────────────────────
const buildStorage = (category) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, DIRS[category]);
    },
    filename: (_req, file, cb) => {
      // UUID filename prevents path traversal & collisions
      const ext      = path.extname(file.originalname).toLowerCase();
      const safeName = `${uuid()}${ext}`;
      cb(null, safeName);
    },
  });

// ─── File filter factory ──────────────────────────────────────────────────────
const buildFileFilter = (category) => (_req, file, cb) => {
  if (ALLOWED_MIMES[category].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type "${file.mimetype}". Allowed: ${ALLOWED_MIMES[category].join(', ')}.`,
        415,
        'INVALID_FILE_TYPE'
      ),
      false
    );
  }
};

// ─── Multer instances ─────────────────────────────────────────────────────────
const uploadMedical = multer({
  storage:    buildStorage('medical'),
  fileFilter: buildFileFilter('medical'),
  limits:     { fileSize: MAX_SIZES.medical },
});

const uploadLab = multer({
  storage:    buildStorage('lab'),
  fileFilter: buildFileFilter('lab'),
  limits:     { fileSize: MAX_SIZES.lab },
});

const uploadAvatar = multer({
  storage:    buildStorage('avatar'),
  fileFilter: buildFileFilter('avatar'),
  limits:     { fileSize: MAX_SIZES.avatar },
});

const uploadBanner = multer({
  storage:    buildStorage('banner'),
  fileFilter: buildFileFilter('banner'),
  limits:     { fileSize: MAX_SIZES.banner },
});

const uploadDepartment = multer({
  storage:    buildStorage('department'),
  fileFilter: buildFileFilter('department'),
  limits:     { fileSize: MAX_SIZES.department },
});

// ─── Multer error handler wrapper ─────────────────────────────────────────────

export const handleUpload = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File size exceeds the allowed limit.', 413, 'FILE_TOO_LARGE'));
    }
    if (err instanceof multer.MulterError) {
      return next(new AppError(`Upload error: ${err.message}`, 400, 'UPLOAD_ERROR'));
    }
    // AppError already constructed in fileFilter
    return next(err);
  });
};

export { uploadMedical, uploadLab, uploadAvatar, uploadBanner, uploadDepartment, DIRS };
