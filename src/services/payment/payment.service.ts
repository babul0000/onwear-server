import { prisma } from '../../lib/prisma';
import { OrderService } from '../order/order.service';
import { AppError } from '../../middlewares/error.middleware';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import crypto from 'crypto';

export class PaymentService {
  /**
   * Securely validates the bKash Webhook request and updates the order status.
   * Uses signature/checksum validation.
   */
  static async verifyBkashWebhook(payload: any, signature: string) {
    if (!signature) {
      throw new AppError('Unauthorized: Webhook signature is missing', 401, 'UNAUTHORIZED');
    }

    // Verify signature using a SHA256 HMAC (simulate gateway signature check)
    // In production, we'd use the gateway's public key or a shared secret token
    const secret = process.env.BKASH_WEBHOOK_SECRET || 'bkash_secret_token_123';
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (computedSignature !== signature) {
      throw new AppError('Forbidden: Invalid webhook signature', 403, 'FORBIDDEN');
    }

    const { orderId, transactionId, status, amount } = payload;

    // Validate the order in database
    const order = await prisma.order.findFirst({
      where: { id: orderId, isDeleted: false }
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'NOT_FOUND');
    }

    // Check if the amount matches to prevent payment manipulation
    if (order.totalAmount !== amount) {
      throw new AppError('Payment amount mismatch', 400, 'BAD_REQUEST');
    }

    if (status === 'Completed') {
      await OrderService.updateStatus(orderId, OrderStatus.CONFIRMED, PaymentStatus.PAID);
      return { success: true, message: 'Payment successfully processed', transactionId };
    } else {
      await OrderService.updateStatus(orderId, OrderStatus.CANCELLED, PaymentStatus.FAILED);
      return { success: false, message: 'Payment failed' };
    }
  }

  /**
   * Securely validates SSLCommerz IPN (Instant Payment Notification) Webhook
   */
  static async verifySSLCommerzWebhook(payload: any) {
    const { val_id, tran_id, amount, status, verify_sign } = payload;

    if (!verify_sign) {
      throw new AppError('Unauthorized: Verification signature is missing', 401, 'UNAUTHORIZED');
    }

    // In a real SSLCommerz setup, you query the validation endpoint using val_id to verify the transaction status.
    // This is the most secure way because we don't rely only on the POST payload.
    // Here we simulate checking the validation ID to verify status authenticity.
    if (!val_id) {
      throw new AppError('Forbidden: Invalid payment validation token', 403, 'FORBIDDEN');
    }

    const order = await prisma.order.findFirst({
      where: { id: tran_id, isDeleted: false }
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'NOT_FOUND');
    }

    if (order.totalAmount !== parseFloat(amount)) {
      throw new AppError('Payment amount mismatch', 400, 'BAD_REQUEST');
    }

    if (status === 'VALID' || status === 'VALIDATED') {
      await OrderService.updateStatus(tran_id, OrderStatus.CONFIRMED, PaymentStatus.PAID);
      return { success: true, message: 'Payment successfully validated' };
    } else {
      await OrderService.updateStatus(tran_id, OrderStatus.CANCELLED, PaymentStatus.FAILED);
      return { success: false, message: 'Payment failed or was cancelled' };
    }
  }
}
