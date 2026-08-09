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
  roleMiddleware(Role.ADMIN) as any,
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
  roleMiddleware(Role.ADMIN) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await ProductService.update(req.params.id, req.body);
      sendSuccessResponse(res, 200, 'Product updated successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Delete product (Soft Delete)
router.delete(
  '/:id',
  authMiddleware as any,
  roleMiddleware(Role.ADMIN) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await ProductService.softDelete(req.params.id);
      sendSuccessResponse(res, 200, 'Product deleted successfully', null);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
