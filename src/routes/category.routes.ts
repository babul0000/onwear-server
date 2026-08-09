import { Router, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category/category.service';
import { sendSuccessResponse } from '../utils/response';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Public: Get all categories
router.get(
  '/',
  async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      // If admin queries, they can optionally see inactive categories
      const includeInactive = req.query.includeInactive === 'true';
      const data = await CategoryService.getAll(includeInactive);
      sendSuccessResponse(res, 200, 'Categories retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Public: Get category by ID
router.get(
  '/:id',
  async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await CategoryService.getById(req.params.id);
      sendSuccessResponse(res, 200, 'Category retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Create category
router.post(
  '/',
  authMiddleware as any,
  roleMiddleware(Role.ADMIN) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await CategoryService.create(req.body);
      sendSuccessResponse(res, 201, 'Category created successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Update category
router.patch(
  '/:id',
  authMiddleware as any,
  roleMiddleware(Role.ADMIN) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await CategoryService.update(req.params.id, req.body);
      sendSuccessResponse(res, 200, 'Category updated successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Delete category (Soft Delete)
router.delete(
  '/:id',
  authMiddleware as any,
  roleMiddleware(Role.ADMIN) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await CategoryService.softDelete(req.params.id);
      sendSuccessResponse(res, 200, 'Category deleted successfully', null);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
