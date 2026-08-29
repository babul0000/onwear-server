import { Router, Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order/order.service';
import { sendSuccessResponse } from '../utils/response';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';
import { AppError } from '../middlewares/error.middleware';

const router = Router();

// Guest Order Tracking (Public)
router.post(
  '/guest-track',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone, orderId } = req.body;
      if (!phone) {
        throw new AppError('Phone number is required for tracking', 400, 'BAD_REQUEST');
      }
      const data = await OrderService.getGuestOrders(phone, orderId);
      sendSuccessResponse(res, 200, 'Guest orders retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Apply auth middleware to all order routes
router.use(authMiddleware as any);


// Place an order (Checkout)
router.post(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { shippingAddress, phone, email, note, couponCode, shippingCost, discountApplied } = req.body;
      const data = await OrderService.checkout(
        userId,
        shippingAddress,
        phone,
        email,
        note,
        couponCode,
        shippingCost,
        discountApplied
      );
      sendSuccessResponse(res, 201, 'Order placed successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Get order history (lists all for Admin, lists own for Customer)
router.get(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const data = await OrderService.getOrders(userId, role);
      sendSuccessResponse(res, 200, 'Orders retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Get single order details
router.get(
  '/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const data = await OrderService.getOrderById(req.params.id, userId, role);
      sendSuccessResponse(res, 200, 'Order retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Update order status
router.patch(
  '/:id/status',
  roleMiddleware(Role.admin) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status, paymentStatus } = req.body;
      const data = await OrderService.updateStatus(req.params.id, status, paymentStatus);
      sendSuccessResponse(res, 200, 'Order status updated successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
