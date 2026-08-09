import { Router, Response, NextFunction } from 'express';
import { WishlistService } from '../services/wishlist/wishlist.service';
import { sendSuccessResponse } from '../utils/response';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware
router.use(authMiddleware as any);

// Get user's wishlist
router.get(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const data = await WishlistService.getWishlist(userId);
      sendSuccessResponse(res, 200, 'Wishlist retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Add product to wishlist
router.post(
  '/:productId',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const data = await WishlistService.addItem(userId, req.params.productId);
      sendSuccessResponse(res, 201, 'Product added to wishlist successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Remove product from wishlist
router.delete(
  '/:productId',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      await WishlistService.removeItem(userId, req.params.productId);
      sendSuccessResponse(res, 200, 'Product removed from wishlist successfully', null);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
