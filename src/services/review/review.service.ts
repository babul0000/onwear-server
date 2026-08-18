import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { createReviewSchema, updateReviewSchema } from '../../utils/validation';

export class ReviewService {
  static async create(userId: string, data: any) {
    const parsed = createReviewSchema.parse(data);

    // Validate Product
    const product = await prisma.product.findFirst({
      where: { id: parsed.productId, isDeleted: false }
    });
    if (!product) {
      throw new AppError('Product not found or deleted', 404, 'NOT_FOUND');
    }

    // Check duplicate review
    const existing = await prisma.review.findFirst({
      where: { userId, productId: parsed.productId, isDeleted: false }
    });
    if (existing) {
      throw new AppError('You have already reviewed this product', 409, 'DUPLICATE_RECORD');
    }

    return prisma.review.create({
      data: {
        rating: parsed.rating,
        comment: parsed.comment,
        userId,
        productId: parsed.productId
      }
    });
  }

  static async getById(id: string) {
    const review = await prisma.review.findFirst({
      where: { id, isDeleted: false },
      include: {
        user: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } }
      }
    });
    if (!review) {
      throw new AppError('Review not found', 404, 'NOT_FOUND');
    }
    return review;
  }

  static async getByProduct(productId: string) {
    return prisma.review.findMany({
      where: { productId, isDeleted: false },
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async update(id: string, userId: string, data: any) {
    const parsed = updateReviewSchema.parse(data);

    const review = await prisma.review.findFirst({
      where: { id, isDeleted: false }
    });
    if (!review) {
      throw new AppError('Review not found', 404, 'NOT_FOUND');
    }

    if (review.userId !== userId) {
      throw new AppError('Forbidden: You can only edit your own reviews', 403, 'FORBIDDEN');
    }

    return prisma.review.update({
      where: { id },
      data: parsed
    });
  }

  static async delete(id: string, userId: string, role: string) {
    const review = await prisma.review.findFirst({
      where: { id, isDeleted: false }
    });
    if (!review) {
      throw new AppError('Review not found', 404, 'NOT_FOUND');
    }

    if (role !== 'admin' && review.userId !== userId) {
      throw new AppError('Forbidden: You can only delete your own reviews', 403, 'FORBIDDEN');
    }

    return prisma.review.update({
      where: { id },
      data: { isDeleted: true }
    });
  }

  static async getAll(includeDeleted: boolean = false) {
    return prisma.review.findMany({
      where: includeDeleted ? undefined : { isDeleted: false },
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, sku: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
