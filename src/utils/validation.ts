import { z } from 'zod';

import { CategoryStatus, ProductStatus } from '@prisma/client';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  address: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters'),
  description: z.string().optional(),
  image: z.string().optional(),
  status: z.nativeEnum(CategoryStatus).optional(),
  parentId: z.string().nullable().optional()
});

export const updateCategorySchema = createCategorySchema.partial();

export const createProductSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters'),
  description: z.string().optional(),
  price: z.number().positive('Price must be greater than 0'),
  discountPrice: z.number().nonnegative('Discount price cannot be negative').optional().nullable(),
  stock: z.number().int().nonnegative('Stock cannot be negative'),
  sku: z.string().min(2, 'SKU must be at least 2 characters'),
  image: z.string().optional(),
  image2: z.string().optional().nullable(),
  images: z.array(z.string()).optional(),
  status: z.nativeEnum(ProductStatus).optional(),
  categoryId: z.string().uuid('Category ID must be a valid UUID')
});

export const updateProductSchema = createProductSchema.partial();

export const createReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().optional(),
  productId: z.string().uuid('Product ID must be a valid UUID')
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().optional()
});

export const checkoutItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  size: z.string().nullable().optional(),
  color: z.string().nullable().optional()
});

export const checkoutSchema = z.object({
  customerName: z.string().min(1, 'Full name is required'),
  email: z.string().email('A valid email address is required'),
  phone: z.string().min(6, 'A valid phone number is required'),
  shippingAddress: z.string().min(3, 'Shipping address is required'),
  zone: z.enum(['inside', 'outside']).optional().default('inside'),
  items: z.array(checkoutItemSchema).optional(),
  note: z.string().optional(),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(['COD', 'BKASH', 'NAGAD', 'ONLINE']).optional().default('COD'),
  paymentPhone: z.string().optional(),
  trxId: z.string().optional()
});

export const guestTrackSchema = z.object({
  phone: z.string().min(6, 'Phone number is required'),
  orderId: z.string().min(1, 'Order ID is required')
});

