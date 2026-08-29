import { Router, Response, NextFunction } from 'express';
import { AddressService } from '../services/address/address.service';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { sendSuccessResponse } from '../utils/response';

const router = Router();

// Apply auth middleware to all address endpoints
router.use(authMiddleware as any);

// List addresses for logged in user
router.get(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const data = await AddressService.getAddresses(userId);
      sendSuccessResponse(res, 200, 'Addresses retrieved successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Create a new address
router.post(
  '/',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const data = await AddressService.createAddress(userId, req.body);
      sendSuccessResponse(res, 201, 'Address created successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Update an address
router.put(
  '/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const addressId = req.params.id;
      const data = await AddressService.updateAddress(addressId, userId, req.body);
      sendSuccessResponse(res, 200, 'Address updated successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

// Delete an address
router.delete(
  '/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const addressId = req.params.id;
      const data = await AddressService.deleteAddress(addressId, userId);
      sendSuccessResponse(res, 200, 'Address deleted successfully', data);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
