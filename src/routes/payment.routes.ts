import { Router, Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment/payment.service';
import { sendSuccessResponse } from '../utils/response';

const router = Router();

// bKash Webhook Callback
router.post(
  '/bkash/webhook',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const signature = req.headers['x-bkash-signature'] as string;
      const data = await PaymentService.verifyBkashWebhook(req.body, signature);
      sendSuccessResponse(res, 200, 'bKash Webhook processed', data);
    } catch (err) {
      next(err);
    }
  }
);

// SSLCommerz IPN Webhook Callback
router.post(
  '/sslcommerz/webhook',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await PaymentService.verifySSLCommerzWebhook(req.body);
      sendSuccessResponse(res, 200, 'SSLCommerz Webhook processed', data);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
