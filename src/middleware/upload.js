// ----------------------------------------------------------------------------
// Multer upload middleware
//
// Memory storage because we stream the buffer straight to R2 — no point
// touching the local filesystem. Two configs:
//
//   uploadImage  — 5MB, image/* only (visual prompt images)
//   uploadMedia  — 100MB, image/video/pdf (campaign media portfolio)
//
// Each exports the `.single('file')` handler ready to use as route middleware.
// ----------------------------------------------------------------------------

import multer from 'multer';

const MB = 1024 * 1024;

const IMAGE_MIME_PREFIX = 'image/';
const VIDEO_MIME_PREFIX = 'video/';
const PDF_MIME = 'application/pdf';

function imageOnlyFilter(_req, file, cb) {
  if (file.mimetype.startsWith(IMAGE_MIME_PREFIX)) {
    cb(null, true);
    return;
  }
  cb(
    new MulterUploadError(
      `Unsupported file type: ${file.mimetype}. Only images are allowed.`,
      'UNSUPPORTED_FILE_TYPE'
    )
  );
}

function imageVideoPdfFilter(_req, file, cb) {
  if (
    file.mimetype.startsWith(IMAGE_MIME_PREFIX) ||
    file.mimetype.startsWith(VIDEO_MIME_PREFIX) ||
    file.mimetype === PDF_MIME
  ) {
    cb(null, true);
    return;
  }
  cb(
    new MulterUploadError(
      `Unsupported file type: ${file.mimetype}. Allowed: image/*, video/*, application/pdf.`,
      'UNSUPPORTED_FILE_TYPE'
    )
  );
}

// Thrown by the fileFilter callbacks; the controller layer checks .code so it
// can return a 400 with a clear message instead of multer's generic error.
export class MulterUploadError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'MulterUploadError';
    this.code = code;
  }
}

export const uploadImage = multer({
  fileFilter: imageOnlyFilter,
  limits: { fileSize: 5 * MB },
  storage: multer.memoryStorage(),
}).single('file');

export const uploadMedia = multer({
  fileFilter: imageVideoPdfFilter,
  limits: { fileSize: 100 * MB },
  storage: multer.memoryStorage(),
}).single('file');

// Maps a buffer's mimetype to the schema's media_type enum (image|video|pdf).
export function mediaTypeFromMime(mime) {
  if (!mime) return 'image';
  if (mime.startsWith(IMAGE_MIME_PREFIX)) return 'image';
  if (mime.startsWith(VIDEO_MIME_PREFIX)) return 'video';
  if (mime === PDF_MIME) return 'pdf';
  return 'image';
}
