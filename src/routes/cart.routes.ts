import { Router, Response, NextFunction } from 'express';
import { CartService } from '../services/cart/cart.service';
import { sendSuccessResponse } from '../utils/response';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';

const router = Router();

// Apply auth middleware to all cart routes
router.use(authMiddleware as any);

// Get user's cart
router.get(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const data = await CartService.getCart(userId);
      sendSuccessResponse(res, 200, 'Cart retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Add item to cart
router.post(
  '/items',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { productId, quantity } = req.body;
      const data = await CartService.addItem(userId, productId, Number(quantity));
      sendSuccessResponse(res, 201, 'Product added to cart successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Update item quantity in cart
router.patch(
  '/items/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { quantity } = req.body;
      const data = await CartService.updateItem(userId, req.params.id, Number(quantity));
      sendSuccessResponse(res, 200, 'Cart item updated successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Remove item from cart
router.delete(
  '/items/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      await CartService.removeItem(userId, req.params.id);
      sendSuccessResponse(res, 200, 'Cart item removed successfully', null);
    } catch (err) {
      next(err);
    }
  }
);

// Clear entire cart
router.delete(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      await CartService.clearCart(userId);
      sendSuccessResponse(res, 200, 'Cart cleared successfully', null);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
