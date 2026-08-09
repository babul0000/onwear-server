import { Router, Response, NextFunction } from 'express';
import { UserService } from '../services/user/user.service';
import { sendSuccessResponse } from '../utils/response';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authMiddleware as any);

// Admin: Get all users
router.get(
  '/',
  roleMiddleware(Role.ADMIN) as any,
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await UserService.getAll();
      sendSuccessResponse(res, 200, 'Users retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Get single user by ID
router.get(
  '/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requesterId = req.user!.userId;
      const requesterRole = req.user!.role;
      const data = await UserService.getById(req.params.id, requesterId, requesterRole);
      sendSuccessResponse(res, 200, 'User profile retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Update profile
router.patch(
  '/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const requesterId = req.user!.userId;
      const requesterRole = req.user!.role;
      const data = await UserService.update(req.params.id, requesterId, requesterRole, req.body);
      sendSuccessResponse(res, 200, 'User profile updated successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Delete user (Soft Delete)
router.delete(
  '/:id',
  roleMiddleware(Role.ADMIN) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      await UserService.softDelete(req.params.id);
      sendSuccessResponse(res, 200, 'User deleted successfully', null);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
