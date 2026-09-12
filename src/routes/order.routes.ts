import { Router, Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order/order.service';
import { sendSuccessResponse } from '../utils/response';
import { optionalAuthMiddleware, authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';
import { Role } from '@prisma/client';
import { checkoutSchema, guestTrackSchema } from '../utils/validation';
import { AppError } from '../middlewares/error.middleware';

const router = Router();

// Guest Order Tracking (Secured Public Route - Requires exact Order ID and Phone)
router.post(
  '/guest-track',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = guestTrackSchema.parse(req.body);
      const data = await OrderService.trackGuestOrder(parsed.phone, parsed.orderId);
      sendSuccessResponse(res, 200, 'Order tracked successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Place an order (Checkout) - Supports both Authenticated and Guest Users
router.post(
  '/',
  optionalAuthMiddleware as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUserId = req.user?.userId;
      const parsed = checkoutSchema.parse(req.body);

      const data = await OrderService.checkout({
        authUserId,
        customerName: parsed.customerName,
        email: parsed.email,
        phone: parsed.phone,
        shippingAddress: parsed.shippingAddress,
        zone: parsed.zone,
        items: parsed.items,
        note: parsed.note,
        couponCode: parsed.couponCode,
        paymentMethod: parsed.paymentMethod,
        paymentPhone: parsed.paymentPhone,
        trxId: parsed.trxId
      });

      sendSuccessResponse(res, 201, 'Order placed successfully', data);
    } catch (err) {
      next(err);
    }
  }
);


// Require authentication for all user order management routes below
router.use(authMiddleware as any);

// Get order history (lists all for Admin, lists own for Customer)
router.get(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const includeDeleted = req.query.includeDeleted === 'true';
      const data = await OrderService.getOrders(userId, role, includeDeleted);
      sendSuccessResponse(res, 200, 'Orders retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Purge all deleted orders immediately from trash (Hard delete)
router.post(
  '/purge-deleted',
  roleMiddleware(Role.admin) as any,
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const count = await OrderService.purgeAllDeleted();
      sendSuccessResponse(res, 200, `${count} trashed order(s) permanently removed from database`, { count });
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

// Customer / Admin: Cancel an order (if PENDING)
router.post(
  '/:id/cancel',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const { reason } = req.body;
      const data = await OrderService.cancelOrder(req.params.id, userId, role, reason);
      sendSuccessResponse(res, 200, 'Order cancelled successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Admin: Restore soft-deleted order from trash
router.post(
  '/:id/restore',
  roleMiddleware(Role.admin) as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await OrderService.restore(req.params.id);
      sendSuccessResponse(res, 200, 'Order restored successfully from trash', data);
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

// Customer / Admin: Delete order (Soft delete to trash with 10-day retention or Admin permanent hard delete)
router.delete(
  '/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const isPermanent = req.query.permanent === 'true';

      if (isPermanent) {
        if (role !== Role.admin) {
          throw new AppError('Forbidden: Only admin can permanently delete orders', 403, 'FORBIDDEN');
        }
        await OrderService.hardDelete(req.params.id);
        sendSuccessResponse(res, 200, 'Order permanently deleted from database', null);
      } else {
        const data = await OrderService.softDelete(req.params.id, userId, role);
        sendSuccessResponse(res, 200, 'Order moved to trash (auto-deletes in 10 days)', data);
      }
    } catch (err) {
      next(err);
    }
  }
);

export default router;
