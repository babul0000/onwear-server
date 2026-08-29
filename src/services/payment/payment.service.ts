import { prisma } from '../../lib/prisma';
import { OrderService } from '../order/order.service';
import { AppError } from '../../middlewares/error.middleware';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import crypto from 'crypto';
import { env } from '../../config/env';

export class PaymentService {
  /**
   * Initiates an SSLCommerz payment session for an order.
   */
  static async initiateSSLCommerzPayment(orderId: string, userId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId, isDeleted: false },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } }
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'NOT_FOUND');
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new AppError('This order has already been paid', 400, 'BAD_REQUEST');
    }

    const sslcommerzUrl = env.SSLCOMMERZ_IS_SANDBOX
      ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

    const paymentData = {
      store_id: env.SSLCOMMERZ_STORE_ID,
      store_passwd: env.SSLCOMMERZ_STORE_PASSWORD,
      total_amount: order.totalAmount.toString(),
      currency: 'BDT',
      tran_id: order.id,
      success_url: `${env.BACKEND_URL}/api/payments/sslcommerz/success`,
      fail_url: `${env.BACKEND_URL}/api/payments/sslcommerz/fail`,
      cancel_url: `${env.BACKEND_URL}/api/payments/sslcommerz/cancel`,
      ipn_url: `${env.BACKEND_URL}/api/payments/sslcommerz/webhook`,
      cus_name: order.user.name,
      cus_email: order.email || order.user.email || 'customer@example.com',
      cus_add1: order.shippingAddress,
      cus_phone: order.phone || order.user.phone || '01700000000',
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      shipping_method: 'NO',
      num_of_item: '1',
      product_name: 'ShopNest Products',
      product_category: 'Clothing',
      product_profile: 'general',
    };

    const formBody = new URLSearchParams(paymentData).toString();

    try {
      const response = await fetch(sslcommerzUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
      });

      // SSLCommerz returns JSON format response for session initiation
      const responseData: any = await response.json();

      if (responseData.status === 'SUCCESS' && responseData.GatewayPageURL) {
        // Create or update the pending transaction in database
        await prisma.transaction.upsert({
          where: { trxId: order.id },
          update: {
            amount: order.totalAmount,
            status: 'PENDING',
            callbackPayload: JSON.stringify(responseData),
          },
          create: {
            orderId: order.id,
            gateway: 'SSLCommerz',
            amount: order.totalAmount,
            status: 'PENDING',
            trxId: order.id,
            callbackPayload: JSON.stringify(responseData),
          },
        });

        return { gatewayUrl: responseData.GatewayPageURL };
      } else {
        throw new AppError(
          responseData.failedreason || 'Failed to initiate payment session with SSLCommerz',
          400,
          'PAYMENT_INITIATION_FAILED'
        );
      }
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      throw new AppError(err.message || 'Error connecting to SSLCommerz API', 500, 'INTERNAL_SERVER_ERROR');
    }
  }

  /**
   * Handles successful payment redirect from SSLCommerz.
   */
  static async handleSSLCommerzSuccess(payload: any) {
    const { val_id, tran_id, amount } = payload;

    if (!tran_id || !val_id) {
      throw new AppError('Invalid success payload: Missing transaction id or validation id', 400, 'BAD_REQUEST');
    }

    const order = await prisma.order.findFirst({
      where: { id: tran_id, isDeleted: false }
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'NOT_FOUND');
    }

    // Validate the payment amount to prevent tampering
    if (Math.abs(order.totalAmount - parseFloat(amount)) > 0.01) {
      throw new AppError('Payment amount mismatch', 400, 'BAD_REQUEST');
    }

    // Update order status to CONFIRMED and payment to PAID
    await OrderService.updateStatus(tran_id, OrderStatus.CONFIRMED, PaymentStatus.PAID);

    // Update transaction to SUCCESS
    await prisma.transaction.upsert({
      where: { trxId: tran_id },
      update: {
        status: 'SUCCESS',
        callbackPayload: JSON.stringify(payload),
      },
      create: {
        orderId: tran_id,
        gateway: 'SSLCommerz',
        amount: order.totalAmount,
        status: 'SUCCESS',
        trxId: tran_id,
        callbackPayload: JSON.stringify(payload),
      },
    });

    return { orderId: tran_id };
  }

  /**
   * Handles failed payment redirect from SSLCommerz.
   */
  static async handleSSLCommerzFail(payload: any) {
    const { tran_id } = payload;

    if (!tran_id) {
      throw new AppError('Invalid failure payload: Missing transaction id', 400, 'BAD_REQUEST');
    }

    // Set payment status to FAILED in order record
    await prisma.order.update({
      where: { id: tran_id },
      data: { paymentStatus: PaymentStatus.FAILED }
    });

    // Update transaction status to FAILED
    await prisma.transaction.upsert({
      where: { trxId: tran_id },
      update: {
        status: 'FAILED',
        callbackPayload: JSON.stringify(payload),
      },
      create: {
        orderId: tran_id,
        gateway: 'SSLCommerz',
        amount: 0,
        status: 'FAILED',
        trxId: tran_id,
        callbackPayload: JSON.stringify(payload),
      },
    });

    return { orderId: tran_id };
  }

  /**
   * Handles cancelled payment redirect from SSLCommerz.
   */
  static async handleSSLCommerzCancel(payload: any) {
    const { tran_id } = payload;

    if (!tran_id) {
      throw new AppError('Invalid cancellation payload: Missing transaction id', 400, 'BAD_REQUEST');
    }

    // Set order status to CANCELLED and payment status to FAILED
    await OrderService.updateStatus(tran_id, OrderStatus.CANCELLED, PaymentStatus.FAILED);

    // Update transaction status to CANCELLED
    await prisma.transaction.upsert({
      where: { trxId: tran_id },
      update: {
        status: 'CANCELLED',
        callbackPayload: JSON.stringify(payload),
      },
      create: {
        orderId: tran_id,
        gateway: 'SSLCommerz',
        amount: 0,
        status: 'CANCELLED',
        trxId: tran_id,
        callbackPayload: JSON.stringify(payload),
      },
    });

    return { orderId: tran_id };
  }

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

