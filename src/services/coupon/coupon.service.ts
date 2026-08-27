import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';

export class CouponService {
  static async create(data: {
    code: string;
    discountType: any;
    discountValue: number;
    minPurchase?: number;
    firstOrderOnly?: boolean;
    isActive?: boolean;
    expiryDate?: string;
    totalLimit?: number;
    userLimit?: number;
  }) {
    if (!data.code || !data.discountType || data.discountValue === undefined) {
      throw new AppError('Code, discount type, and discount value are required', 400, 'BAD_REQUEST');
    }

    const existing = await prisma.coupon.findUnique({
      where: { code: data.code.trim().toUpperCase() }
    });

    if (existing) {
      throw new AppError('Coupon code already exists', 409, 'DUPLICATE_RECORD');
    }

    return prisma.coupon.create({
      data: {
        code: data.code.trim().toUpperCase(),
        discountType: data.discountType,
        discountValue: Number(data.discountValue),
        minPurchase: data.minPurchase !== undefined ? Number(data.minPurchase) : 0,
        firstOrderOnly: !!data.firstOrderOnly,
        isActive: data.isActive !== undefined ? !!data.isActive : true,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        totalLimit: data.totalLimit !== undefined ? Number(data.totalLimit) : 100,
        userLimit: data.userLimit !== undefined ? Number(data.userLimit) : 1
      }
    });
  }

  static async getAll() {
    return prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  static async validateCoupon(code: string, subtotal: number, userId?: string) {
    if (!code) {
      throw new AppError('Coupon code is required', 400, 'BAD_REQUEST');
    }

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: { equals: code.trim(), mode: 'insensitive' }
      }
    });

    if (!coupon) {
      throw new AppError('Invalid coupon code', 404, 'NOT_FOUND');
    }

    if (!coupon.isActive) {
      throw new AppError('This coupon is no longer active', 400, 'BAD_REQUEST');
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      throw new AppError('This coupon has expired', 400, 'BAD_REQUEST');
    }

    if (subtotal < coupon.minPurchase) {
      throw new AppError(
        `Minimum purchase of Tk ${coupon.minPurchase.toLocaleString('en-BD')} is required for this coupon`,
        400,
        'BAD_REQUEST'
      );
    }

    if (coupon.usedCount >= coupon.totalLimit) {
      throw new AppError('This coupon has reached its usage limit', 400, 'BAD_REQUEST');
    }

    if (coupon.firstOrderOnly && userId) {
      const orderCount = await prisma.order.count({
        where: { userId, isDeleted: false }
      });
      if (orderCount > 0) {
        throw new AppError('This coupon is only valid for your first order', 400, 'BAD_REQUEST');
      }
    }

    // Calculate discount
    let discountApplied = 0;
    if (coupon.discountType === 'FLAT') {
      discountApplied = Math.min(coupon.discountValue, subtotal);
    } else if (coupon.discountType === 'PERCENTAGE') {
      discountApplied = (subtotal * coupon.discountValue) / 100;
    }

    return {
      couponId: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountApplied
    };
  }
}
