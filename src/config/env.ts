import dotenv from 'dotenv';
import path from 'path';

// Load .env file from root of backend
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const env = {
  PORT: Number(process.env.PORT) || 5000,
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'shopnest_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000',
  SSLCOMMERZ_STORE_ID: process.env.SSLCOMMERZ_STORE_ID || 'testbox',
  SSLCOMMERZ_STORE_PASSWORD: process.env.SSLCOMMERZ_STORE_PASSWORD || 'testbox@ssl',
  SSLCOMMERZ_IS_SANDBOX: process.env.SSLCOMMERZ_IS_SANDBOX === 'true' || process.env.SSLCOMMERZ_IS_SANDBOX === undefined,
};

