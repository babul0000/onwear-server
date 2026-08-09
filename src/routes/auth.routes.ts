import { Router, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth/auth.service';
import { sendSuccessResponse } from '../utils/response';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';

const router = Router();

router.post(
  '/register',
  async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await AuthService.register(req.body);
      sendSuccessResponse(res, 201, 'User registered successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/login',
  async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await AuthService.login(req.body);
      sendSuccessResponse(res, 200, 'User logged in successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/me',
  authMiddleware as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const data = await AuthService.getMe(userId);
      sendSuccessResponse(res, 200, 'User profile retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
