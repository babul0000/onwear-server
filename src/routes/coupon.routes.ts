import { Router, Response, NextFunction } from 'express';
import { CouponService } from '../services/coupon/coupon.service';
import { sendSuccessResponse } from '../utils/response';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';

const router = Router();

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
