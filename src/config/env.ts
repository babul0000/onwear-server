import dotenv from 'dotenv';
import path from 'path';

// Load .env file from root of backend
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const env = {
  PORT: Number(process.env.PORT) || 5000,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'shopnest_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET ? process.env.JWT_SECRET + '_refresh' : 'shopnest_refresh_secret'),
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000',
  SSLCOMMERZ_STORE_ID: process.env.SSLCOMMERZ_STORE_ID || 'testbox',
  SSLCOMMERZ_STORE_PASSWORD: process.env.SSLCOMMERZ_STORE_PASSWORD || 'testbox@ssl',
  SSLCOMMERZ_IS_SANDBOX: process.env.SSLCOMMERZ_IS_SANDBOX === 'true' || process.env.SSLCOMMERZ_IS_SANDBOX === undefined,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
};

