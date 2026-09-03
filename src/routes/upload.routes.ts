import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendSuccessResponse } from '../utils/response';
import { AppError } from '../middlewares/error.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// Allowed image mime types
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only image files (JPEG, PNG, WEBP, GIF, AVIF) are allowed', 400, 'INVALID_FILE_TYPE'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Single image upload endpoint (Protected with authMiddleware)
router.post(
  '/',
  authMiddleware as any,
  upload.single('image'),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.file) {
        throw new AppError('No image file provided', 400, 'BAD_REQUEST');
      }

      const host = req.get('host');
      const protocol = req.protocol;
      const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

      sendSuccessResponse(res, 201, 'Image uploaded successfully', {
        url: fileUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    } catch (err) {
      next(err);
    }
  }
);

// Multiple image upload endpoint (e.g. for product gallery)
router.post(
  '/multiple',
  authMiddleware as any,
  upload.array('images', 8),
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw new AppError('No image files provided', 400, 'BAD_REQUEST');
      }

      const host = req.get('host');
      const protocol = req.protocol;

      const results = files.map((file) => ({
        url: `${protocol}://${host}/uploads/${file.filename}`,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size
      }));

      sendSuccessResponse(res, 201, 'Images uploaded successfully', {
        files: results,
        urls: results.map((r) => r.url)
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
