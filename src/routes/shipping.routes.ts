import { Router, Response, NextFunction } from 'express';
import { sendSuccessResponse } from '../utils/response';

const router = Router();

router.get(
  '/rates',
  async (req, res, next) => {
    try {
      // Predefined rates for Bangladesh: Inside Dhaka = 80 Tk, Outside Dhaka = 150 Tk
      sendSuccessResponse(res, 200, 'Shipping rates retrieved successfully', {
        insideDhaka: 80,
        outsideDhaka: 150
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
