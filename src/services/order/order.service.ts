import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { OrderStatus, PaymentStatus, AccountStatus, CreatedFrom, Role } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { SettingService } from '../setting/setting.service';
import { CouponService } from '../coupon/coupon.service';

export interface CheckoutInput {
  authUserId?: string;
  customerName?: string;
  email: string;
  phone: string;
  shippingAddress: string;
  zone?: 'inside' | 'outside' | string;
  items?: Array<{
    productId: string;
    quantity: number;
    size?: string | null;
    color?: string | null;
  }>;
  note?: string;
  couponCode?: string;
  paymentMethod?: string;
  paymentPhone?: string;
  trxId?: string;
}

export class OrderService {
  static async checkout(input: CheckoutInput) {
    const {
      authUserId,
      customerName,
      email,
      phone,
      shippingAddress,
      zone = 'inside',
      items: rawItems,
      note,
      couponCode,
      paymentMethod = 'COD',
      paymentPhone,
      trxId
    } = input;

    if (!shippingAddress || !phone) {
      throw new AppError('Shipping address and phone number are required', 400, 'BAD_REQUEST');
    }

    if (!email || !email.includes('@')) {
      throw new AppError('A valid email address is required for order processing and confirmation', 400, 'BAD_REQUEST');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanPhone = phone.trim();
    const cleanName = customerName?.trim() || 'Valued Customer';

    let targetUserId = authUserId;
    let autoAccountCreated = false;
    let activationRawToken: string | null = null;

    // 1. Determine checkout user & auto-create account if new guest
    if (!targetUserId) {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });

      if (existingUser) {
        targetUserId = existingUser.id;
        autoAccountCreated = false;
      }
    }

    // 2. Prepare items list
    let checkoutItems: Array<{
      productId: string;
      quantity: number;
      size?: string | null;
      color?: string | null;
    }> = [];

    let dbCartIdToClear: string | null = null;

    if (rawItems && rawItems.length > 0) {
      checkoutItems = rawItems;
    } else if (targetUserId) {
      const cart = await prisma.cart.findUnique({
        where: { userId: targetUserId },
        include: { items: true }
      });

      if (cart && cart.items.length > 0) {
        checkoutItems = cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          size: item.size,
          color: item.color
        }));
        dbCartIdToClear = cart.id;
      }
    }

    if (checkoutItems.length === 0) {
      throw new AppError('Cannot place an order with an empty cart', 400, 'BAD_REQUEST');
    }

    // 3. Securely determine shipping cost from Store Settings
    const storeSettings = await SettingService.getSettings();
    const isOutside = zone === 'outside' || shippingAddress.toLowerCase().includes('outside dhaka');
    const calculatedShippingCost = isOutside
      ? storeSettings.shippingOutsideDhaka
      : storeSettings.shippingInsideDhaka;

    // 4. Execute Transaction with Concurrency-Safe Decrement & Server-Side Price Calculation
    const orderResult = await prisma.$transaction(async (tx) => {
      // If user doesn't exist yet, create them inside transaction
      if (!targetUserId) {
        const newUser = await tx.user.create({
          data: {
            name: cleanName,
            email: normalizedEmail,
            password: null, // Null until customer sets password via activation link
            phone: cleanPhone,
            address: shippingAddress,
            role: Role.customer,
            accountStatus: AccountStatus.PENDING_ACTIVATION,
            createdFrom: CreatedFrom.GUEST_CHECKOUT,
            emailVerified: false
          }
        });

        await tx.cart.create({
          data: { userId: newUser.id }
        });

        await tx.wishlist.create({
          data: { userId: newUser.id }
        });

        // Generate cryptographically secure one-time activation token (24 hour expiry)
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await tx.activationToken.create({
          data: {
            userId: newUser.id,
            tokenHash,
            expiresAt
          }
        });

        targetUserId = newUser.id;
        autoAccountCreated = true;
        activationRawToken = rawToken;
      }

      let itemsTotal = 0;
      const orderItemsData: any[] = [];

      for (const item of checkoutItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product || product.isDeleted || product.status !== 'ACTIVE') {
          throw new AppError(`Product "${product?.name || 'Item'}" is no longer available`, 400, 'BAD_REQUEST');
        }

        if (product.stock < item.quantity) {
          throw new AppError(
            `Insufficient stock for "${product.name}". Available: ${product.stock}`,
            400,
            'OUT_OF_STOCK'
          );
        }

        const priceSnap =
          product.discountPrice !== null && product.discountPrice !== undefined
            ? product.discountPrice
            : product.price;
        const subtotal = priceSnap * item.quantity;
        itemsTotal += subtotal;

        // Atomic conditional decrement to eliminate race conditions
        const updatedProductCount = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: { gte: item.quantity },
            status: 'ACTIVE',
            isDeleted: false
          },
          data: {
            stock: { decrement: item.quantity }
          }
        });

        if (updatedProductCount.count === 0) {
          throw new AppError(
            `Stock for "${product.name}" was just reserved by another order. Please adjust quantity.`,
            400,
            'OUT_OF_STOCK'
          );
        }

        const currentStockCheck = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true }
        });

        if (currentStockCheck && currentStockCheck.stock === 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { status: 'OUT_OF_STOCK' }
          });
        }

        orderItemsData.push({
          productId: item.productId,
          productName: product.name,
          price: priceSnap,
          quantity: item.quantity,
          subtotal,
          size: item.size || null,
          color: item.color || null
        });
      }

      // Validate coupon securely on server
      let calculatedDiscount = 0;
      let validatedCouponCode: string | null = null;

      if (couponCode && couponCode.trim()) {
        const couponResult = await CouponService.validateCoupon(
          couponCode.trim(),
          itemsTotal,
          targetUserId
        );
        calculatedDiscount = couponResult.discountApplied;
        validatedCouponCode = couponResult.code;

        await tx.coupon.update({
          where: { id: couponResult.couponId },
          data: { usedCount: { increment: 1 } }
        });
      }

      // Check for dynamic free shipping threshold
      let finalShippingCost = calculatedShippingCost;
      if (storeSettings.freeShippingMinAmount > 0 && itemsTotal >= storeSettings.freeShippingMinAmount) {
        finalShippingCost = 0;
      }

      // Calculate final total securely on the server
      const totalAmount = Math.max(0, itemsTotal - calculatedDiscount + finalShippingCost);

      // Create Order linked to user
      const createdOrder = await tx.order.create({
        data: {
          userId: targetUserId!,
          totalAmount,
          shippingAddress,
          phone: cleanPhone,
          email: normalizedEmail,
          note: note || null,
          shippingCost: finalShippingCost,
          couponCode: validatedCouponCode,
          discountApplied: calculatedDiscount,
          paymentMethod: paymentMethod || 'COD',
          paymentPhone: paymentPhone || null,
          trxId: trxId || null,
          status: OrderStatus.PENDING,
          paymentStatus: paymentMethod === 'COD' ? PaymentStatus.UNPAID : PaymentStatus.UNPAID,
          items: {
            create: orderItemsData
          }
        },
        include: {
          items: true
        }
      });

      // Clear DB Cart Items if user had a registered cart
      if (dbCartIdToClear) {
        await tx.cartItem.deleteMany({
          where: { cartId: dbCartIdToClear }
        });
      }

      return createdOrder;
    });

    // 5. Trigger Safe Asynchronous Email & SMS Dispatch (non-blocking)
    if (autoAccountCreated && activationRawToken) {
      EmailService.sendAccountActivationEmail({
        to: normalizedEmail,
        name: cleanName,
        token: activationRawToken,
        orderId: orderResult.id
      }).catch((err) => console.error('[OrderService] Async activation email dispatch error:', err));

      SmsService.sendActivationSms({
        phone: cleanPhone,
        name: cleanName,
        activationToken: activationRawToken
      }).catch((err) => console.error('[OrderService] Async activation SMS dispatch error:', err));
    }

    EmailService.sendOrderConfirmationEmail({
      to: normalizedEmail,
      name: cleanName,
      order: orderResult
    }).catch((err) => console.error('[OrderService] Async order confirmation email error:', err));

    SmsService.sendOrderConfirmationSms({
      phone: cleanPhone,
      orderId: orderResult.id,
      totalAmount: orderResult.totalAmount,
      customerName: cleanName
    }).catch((err) => console.error('[OrderService] Async order confirmation SMS error:', err));

    return {
      ...orderResult,
      autoAccountCreated,
      customerEmail: normalizedEmail
    };
  }

  static async cancelOrder(orderId: string, userId: string, role: string, reason?: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, isDeleted: false },
      include: { items: true }
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'NOT_FOUND');
    }

    if (role !== 'admin' && order.userId !== userId) {
      throw new AppError('Forbidden: You can only cancel your own orders', 403, 'FORBIDDEN');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new AppError(
        `Order cannot be cancelled because it is already ${order.status.toLowerCase()}. Please contact customer support.`,
        400,
        'CANNOT_CANCEL'
      );
    }

    return prisma.$transaction(async (tx) => {
      // 1. Restock items atomically
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity },
            status: 'ACTIVE'
          }
        });
      }

      // 2. Update order status to CANCELLED
      return tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelReason: reason || 'Cancelled by customer'
        },
        include: { items: true }
      });
    });
  }

  static async getOrderById(orderId: string, userId: string, role: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, isDeleted: false },
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true } }
      }
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'NOT_FOUND');
    }

    if (role !== 'admin' && order.userId !== userId) {
      throw new AppError('Forbidden: Access is denied', 403, 'FORBIDDEN');
    }

    return order;
  }

  static async getOrders(userId: string, role: string) {
    if (role === 'admin') {
      return prisma.order.findMany({
        where: { isDeleted: false },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: true
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return prisma.order.findMany({
      where: { userId, isDeleted: false },
      include: {
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async updateStatus(orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, isDeleted: false }
    });
    if (!order) {
      throw new AppError('Order not found', 404, 'NOT_FOUND');
    }

    return prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(paymentStatus && { paymentStatus })
      },
      include: {
        items: true
      }
    });
  }

  static async trackGuestOrder(phone: string, orderId: string) {
    const cleanPhone = phone.trim();
    const cleanOrderId = orderId.trim();

    const order = await prisma.order.findFirst({
      where: {
        id: cleanOrderId,
        phone: cleanPhone,
        isDeleted: false
      },
      include: {
        items: true
      }
    });

    if (!order) {
      throw new AppError(
        'No order found matching the provided Order ID and Phone Number. Please verify and try again.',
        404,
        'NOT_FOUND'
      );
    }

    return order;
  }
}


