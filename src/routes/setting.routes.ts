import { Router, Response, NextFunction } from 'express';
import { SettingService } from '../services/setting/setting.service';
import { sendSuccessResponse } from '../utils/response';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Public: Get store settings
router.get(
  '/',
  async (_req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await SettingService.getSettings();
      sendSuccessResponse(res, 200, 'Store settings retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Update store settings
router.patch(
  '/',
  authMiddleware as any,
  roleMiddleware(Role.admin) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await SettingService.updateSettings(req.body);
      sendSuccessResponse(res, 200, 'Store settings updated successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
