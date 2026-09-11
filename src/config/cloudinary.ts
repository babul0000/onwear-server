import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true
});

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

/**
 * Uploads an image buffer directly to Cloudinary with auto format (WebP/AVIF) and auto compression
 */
export const uploadBufferToCloudinary = (
  buffer: Buffer,
  folder = 'onwear/uploads'
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format: 'webp',
        transformation: [
          { width: 2560, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
          { flags: 'lossy' }
        ]
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Cloudinary upload failed'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height
        });
      }
    );

    // Stream the in-memory buffer to Cloudinary
    uploadStream.end(buffer);
  });
};

export const isCloudinaryConfigured = (): boolean => {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
};

export default cloudinary;
