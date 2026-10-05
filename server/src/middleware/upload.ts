import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';
import { badRequest } from '../utils/errors.js';

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadRoot);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

/**
 * Single-image upload guard.
 *
 * Rejects anything that is not an allowed image MIME type and enforces the
 * configured size ceiling. The original filename is never trusted for the
 * stored path — a random name is generated instead.
 */
export const uploadImage = multer({
  storage,
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter(_req, file, cb) {
    if (!env.allowedMimeTypes.includes(file.mimetype)) {
      cb(badRequest(`Unsupported file type "${file.mimetype}". Allowed: ${env.allowedMimeTypes.join(', ')}.`));
      return;
    }
    cb(null, true);
  },
}).single('image');

export { uploadRoot };
