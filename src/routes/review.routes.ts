import { Router, Response, NextFunction } from 'express';
import { ReviewService } from '../services/review/review.service';
import { sendSuccessResponse } from '../utils/response';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Admin: Get all reviews
router.get(
  '/',
  authMiddleware as any,
  roleMiddleware(Role.admin) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const includeDeleted = req.query.includeDeleted === 'true';
      const data = await ReviewService.getAll(includeDeleted);
      sendSuccessResponse(res, 200, 'Reviews retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Public: Get featured top reviews for homepage social proof hub
router.get(
  '/featured',
  async (_req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const data = await ReviewService.getFeatured();
      sendSuccessResponse(res, 200, 'Featured reviews retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Public: Get aggregated review & order statistics
router.get(
  '/stats',
  async (_req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      const data = await ReviewService.getStats();
      sendSuccessResponse(res, 200, 'Review stats retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Public: Get reviews of a product
router.get(
  '/product/:productId',
  async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await ReviewService.getByProduct(req.params.productId);
      sendSuccessResponse(res, 200, 'Product reviews retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Public: Get review details by ID
router.get(
  '/:id',
  async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await ReviewService.getById(req.params.id);
      sendSuccessResponse(res, 200, 'Review retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Customer: Create review
router.post(
  '/',
  authMiddleware as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const data = await ReviewService.create(userId, req.body);
      sendSuccessResponse(res, 201, 'Review created successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Customer: Update own review
router.patch(
  '/:id',
  authMiddleware as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const data = await ReviewService.update(req.params.id, userId, req.body);
      sendSuccessResponse(res, 200, 'Review updated successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Cleanup all soft-deleted reviews
router.delete(
  '/cleanup/deleted',
  authMiddleware as any,
  roleMiddleware(Role.admin) as any,
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await ReviewService.cleanupDeleted();
      sendSuccessResponse(res, 200, 'Deleted reviews cleaned up successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Customer/Admin: Delete review (Hard delete row to free unique constraint)
router.delete(
  '/:id',
  authMiddleware as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      await ReviewService.delete(req.params.id, userId, role);
      sendSuccessResponse(res, 200, 'Review deleted successfully', null);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
