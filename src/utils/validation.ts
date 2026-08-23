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
