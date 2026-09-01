import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth/auth.service';
import { sendSuccessResponse } from '../utils/response';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for activation resends (max 5 attempts per 15 mins)
const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many activation email requests. Please wait a few minutes before trying again.',
    error: { code: 'TOO_MANY_REQUESTS' }
  }
});

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

// Verify activation token validity
router.post(
  '/verify-activation-token',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.body;
      const data = await AuthService.verifyActivationToken(token);
      sendSuccessResponse(res, 200, 'Activation token is valid', data);
    } catch (err) {
      next(err);
    }
  }
);

// Set password and activate account
router.post(
  '/set-password',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, password } = req.body;
      const data = await AuthService.setPasswordAndActivate(token, password);
      sendSuccessResponse(res, 200, 'Account activated and password set successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Resend account activation email
router.post(
  '/resend-activation',
  resendLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;
      const data = await AuthService.resendActivationEmail(email);
      sendSuccessResponse(res, 200, data.message, data);
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

