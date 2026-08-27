import { Router, Response, NextFunction } from 'express';
import { CouponService } from '../services/coupon/coupon.service';
import { sendSuccessResponse } from '../utils/response';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Admin: Create a new coupon
router.post(
  '/',
  authMiddleware as any,
  roleMiddleware(Role.admin) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await CouponService.create(req.body);
      sendSuccessResponse(res, 201, 'Coupon created successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Get all coupons
router.get(
  '/',
  authMiddleware as any,
  roleMiddleware(Role.admin) as any,
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await CouponService.getAll();
      sendSuccessResponse(res, 200, 'Coupons retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/validate',
  authMiddleware as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { code, subtotal } = req.body;
      
      const data = await CouponService.validateCoupon(code, subtotal, userId);
      sendSuccessResponse(res, 200, 'Coupon validated successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
