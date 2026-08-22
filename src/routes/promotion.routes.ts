import { Router, Response, NextFunction } from 'express';
import { PromotionService } from '../services/promotion/promotion.service';
import { sendSuccessResponse } from '../utils/response';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Public: Get current hero banner
router.get(
  '/hero',
  async (_req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await PromotionService.getHeroBanner();
      sendSuccessResponse(res, 200, 'Hero banner retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Update current hero banner
router.post(
  '/hero',
  authMiddleware as any,
  roleMiddleware(Role.admin) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { imageUrl } = req.body;
      const data = await PromotionService.updateHeroBanner(imageUrl);
      sendSuccessResponse(res, 200, 'Hero banner updated successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
