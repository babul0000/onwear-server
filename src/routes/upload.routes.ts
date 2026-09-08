import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendSuccessResponse } from '../utils/response';
import { AppError } from '../middlewares/error.middleware';
import { authMiddleware } from '../middlewares/auth.middleware';
import { uploadBufferToCloudinary, isCloudinaryConfigured } from '../config/cloudinary';

const router = Router();

// Ensure local uploads directory exists for fallback
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Memory storage to stream directly to Cloudinary without disk I/O bottlenecks
const memoryStorage = multer.memoryStorage();

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
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  }
});

// Single image upload endpoint (Protected with authMiddleware)
router.post(
  '/',
  authMiddleware as any,
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new AppError('No image file provided', 400, 'BAD_REQUEST');
      }

      if (isCloudinaryConfigured()) {
        const folder = req.body.folder || 'onwear/uploads';
        const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, folder);

        sendSuccessResponse(res, 201, 'Image uploaded successfully to Cloudinary CDN', {
          url: cloudinaryResult.url,
          publicId: cloudinaryResult.publicId,
          format: cloudinaryResult.format,
          size: cloudinaryResult.bytes,
          mimetype: req.file.mimetype
        });
        return;
      }

      // Fallback to local disk storage if Cloudinary is not configured
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
      const filename = `${uniqueSuffix}${ext}`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, req.file.buffer);

      const host = req.get('host');
      const protocol = req.protocol;
      const fileUrl = `${protocol}://${host}/uploads/${filename}`;

      sendSuccessResponse(res, 201, 'Image uploaded successfully to local storage', {
        url: fileUrl,
        filename,
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
  upload.array('images', 10),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        throw new AppError('No image files provided', 400, 'BAD_REQUEST');
      }

      if (isCloudinaryConfigured()) {
        const folder = req.body.folder || 'onwear/uploads';
        const uploadPromises = files.map(async (file) => {
          const result = await uploadBufferToCloudinary(file.buffer, folder);
          return {
            url: result.url,
            publicId: result.publicId,
            format: result.format,
            size: result.bytes,
            mimetype: file.mimetype
          };
        });

        const results = await Promise.all(uploadPromises);

        sendSuccessResponse(res, 201, 'Images uploaded successfully to Cloudinary CDN', {
          files: results,
          urls: results.map((r) => r.url)
        });
        return;
      }

      // Fallback to local disk storage
      const host = req.get('host');
      const protocol = req.protocol;

      const results = files.map((file) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        const filename = `${uniqueSuffix}${ext}`;
        const filePath = path.join(uploadsDir, filename);

        fs.writeFileSync(filePath, file.buffer);

        return {
          url: `${protocol}://${host}/uploads/${filename}`,
          filename,
          mimetype: file.mimetype,
          size: file.size
        };
      });

      sendSuccessResponse(res, 201, 'Images uploaded successfully to local storage', {
        files: results,
        urls: results.map((r) => r.url)
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
