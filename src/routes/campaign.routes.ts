import { Router, Response, NextFunction } from 'express';
import { CampaignService } from '../services/campaign/campaign.service';
import { sendSuccessResponse } from '../utils/response';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Public: Get all campaigns (active/inactive)
router.get(
  '/',
  async (_req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await CampaignService.getAll();
      sendSuccessResponse(res, 200, 'Campaigns retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Create a new campaign
router.post(
  '/',
  authMiddleware as any,
  roleMiddleware(Role.admin) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await CampaignService.create(req.body);
      sendSuccessResponse(res, 201, 'Campaign created successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Update campaign details
router.patch(
  '/:id',
  authMiddleware as any,
  roleMiddleware(Role.admin) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await CampaignService.update(req.params.id, req.body);
      sendSuccessResponse(res, 200, 'Campaign updated successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Delete a campaign
router.delete(
  '/:id',
  authMiddleware as any,
  roleMiddleware(Role.admin) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await CampaignService.delete(req.params.id);
      sendSuccessResponse(res, 200, 'Campaign deleted successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
