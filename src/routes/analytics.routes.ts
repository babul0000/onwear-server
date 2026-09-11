import { Router, Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analytics/analytics.service';
import { sendSuccessResponse } from '../utils/response';
import { authMiddleware, AuthenticatedRequest, optionalAuthMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Public: Track visitor hit / session
router.post(
  '/track-visit',
  optionalAuthMiddleware as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { sessionId, path } = req.body;
      const userAgent = req.headers['user-agent'];
      const ip = req.ip || req.socket.remoteAddress;
      const userId = req.user?.userId;

      await AnalyticsService.trackVisit({
        sessionId,
        path,
        userAgent,
        ipHash: ip ? Buffer.from(ip).toString('base64').slice(0, 16) : undefined,
        userId
      });

      sendSuccessResponse(res, 200, 'Visit tracked successfully', { tracked: true });
    } catch (err) {
      next(err);
    }
  }
);

// Public: Track product page view
router.post(
  '/track-view',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productId, sessionId } = req.body;
      if (!productId) {
        sendSuccessResponse(res, 200, 'Product view ignored', { tracked: false });
        return;
      }

      await AnalyticsService.trackProductView({
        productId,
        sessionId
      });

      sendSuccessResponse(res, 200, 'Product view tracked successfully', { tracked: true });
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Get Real Analytics Dashboard Overview
router.get(
  '/dashboard-overview',
  authMiddleware as any,
  roleMiddleware(Role.admin) as any,
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await AnalyticsService.getDashboardOverview();
      sendSuccessResponse(res, 200, 'Dashboard overview metrics retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
