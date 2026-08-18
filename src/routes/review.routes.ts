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

// Customer/Admin: Delete review (Soft delete)
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
