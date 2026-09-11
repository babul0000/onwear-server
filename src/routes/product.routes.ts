import { Router, Response, NextFunction } from 'express';
import { ProductService } from '../services/product/product.service';
import { sendSuccessResponse, sendPaginatedResponse } from '../utils/response';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Public: Get all products with search, filter, sort, and pagination
router.get(
  '/',
  async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const includeDeleted = req.query.includeDeleted === 'true';
      const { data, meta } = await ProductService.getAll(req.query, includeDeleted);
      sendPaginatedResponse(res, 200, 'Products retrieved successfully', data, meta);
    } catch (err) {
      next(err);
    }
  }
);

// Public: Get product by ID
router.get(
  '/:id',
  async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await ProductService.getById(req.params.id);
      sendSuccessResponse(res, 200, 'Product retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Create product
router.post(
  '/',
  authMiddleware as any,
  roleMiddleware(Role.admin) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await ProductService.create(req.body);
      sendSuccessResponse(res, 201, 'Product created successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Update product
router.patch(
  '/:id',
  authMiddleware as any,
  roleMiddleware(Role.admin) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await ProductService.update(req.params.id, req.body);
      sendSuccessResponse(res, 200, 'Product updated successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Purge all deleted products immediately (Hard delete)
router.post(
  '/purge-deleted',
  authMiddleware as any,
  roleMiddleware(Role.admin) as any,
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const count = await ProductService.purgeAllDeleted();
      sendSuccessResponse(res, 200, `${count} deleted product(s) permanently removed from database`, { count });
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Restore soft-deleted product
router.post(
  '/:id/restore',
  authMiddleware as any,
  roleMiddleware(Role.admin) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await ProductService.restore(req.params.id);
      sendSuccessResponse(res, 200, 'Product restored successfully from trash', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Delete product (Soft Delete or Permanent Hard Delete)
router.delete(
  '/:id',
  authMiddleware as any,
  roleMiddleware(Role.admin) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const isPermanent = req.query.permanent === 'true';
      if (isPermanent) {
        await ProductService.hardDelete(req.params.id);
        sendSuccessResponse(res, 200, 'Product permanently deleted from database', null);
      } else {
        await ProductService.softDelete(req.params.id);
        sendSuccessResponse(res, 200, 'Product moved to trash (auto-deletes in 5 days)', null);
      }
    } catch (err) {
      next(err);
    }
  }
);

export default router;
