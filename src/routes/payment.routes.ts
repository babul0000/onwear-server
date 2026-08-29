import { Router, Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment/payment.service';
import { sendSuccessResponse } from '../utils/response';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { env } from '../config/env';

const router = Router();

// SSLCommerz Payment Initiation Endpoint (Protected)
router.post(
  '/sslcommerz/initiate/:orderId',
  authMiddleware as any,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const orderId = req.params.orderId;
      const data = await PaymentService.initiateSSLCommerzPayment(orderId, userId);
      sendSuccessResponse(res, 200, 'SSLCommerz payment session initiated', data);
    } catch (err) {
      next(err);
    }
  }
);

// SSLCommerz Success Redirect Callback (Public browser POST)
router.post(
  '/sslcommerz/success',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await PaymentService.handleSSLCommerzSuccess(req.body);
      res.redirect(`${env.FRONTEND_URL}/orders?payment=success&orderId=${data.orderId}`);
    } catch (err) {
      // In case of error in verification, redirect to orders with error query parameter
      console.error('SSLCommerz Success verification error:', err);
      const orderId = req.body.tran_id || '';
      res.redirect(`${env.FRONTEND_URL}/orders?payment=failed&orderId=${orderId}&error=verification_failed`);
    }
  }
);

// SSLCommerz Fail Redirect Callback (Public browser POST)
router.post(
  '/sslcommerz/fail',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await PaymentService.handleSSLCommerzFail(req.body);
      res.redirect(`${env.FRONTEND_URL}/orders?payment=failed&orderId=${data.orderId}`);
    } catch (err) {
      console.error('SSLCommerz Fail handler error:', err);
      const orderId = req.body.tran_id || '';
      res.redirect(`${env.FRONTEND_URL}/orders?payment=failed&orderId=${orderId}`);
    }
  }
);

// SSLCommerz Cancel Redirect Callback (Public browser POST)
router.post(
  '/sslcommerz/cancel',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await PaymentService.handleSSLCommerzCancel(req.body);
      res.redirect(`${env.FRONTEND_URL}/orders?payment=cancelled&orderId=${data.orderId}`);
    } catch (err) {
      console.error('SSLCommerz Cancel handler error:', err);
      const orderId = req.body.tran_id || '';
      res.redirect(`${env.FRONTEND_URL}/orders?payment=cancelled&orderId=${orderId}`);
    }
  }
);

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

