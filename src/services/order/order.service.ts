import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { OrderStatus, PaymentStatus, AccountStatus, CreatedFrom, Role } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { SettingService } from '../setting/setting.service';
import { CouponService } from '../coupon/coupon.service';
import { generateToken } from '../../utils/jwt';

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
  advanceAmount?: number;
  advancePaymentMethod?: string;
  advanceTrxId?: string;
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
      trxId,
      advanceAmount: inputAdvanceAmount,
      advancePaymentMethod: inputAdvancePaymentMethod,
      advanceTrxId: inputAdvanceTrxId
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

    // 3. Securely determine shipping cost from Store Settings with robust Outside Dhaka detection
    const storeSettings = await SettingService.getSettings();
    const addrLower = shippingAddress.toLowerCase();
    
    // Comprehensive Outside Dhaka districts and suburban courier keywords
    const outsideDhakaKeywords = [
      'outside dhaka', 'ঢাকার বাইরে',
      // Non-Dhaka Divisions & Key Districts
      'chittagong', 'chattogram', 'চট্টগ্রাম', 'coxs bazar', "cox's bazar", 'coxsbazar', 'কক্সবাজার',
      'cumilla', 'comilla', 'কুমিল্লা', 'feni', 'ফেনী', 'brahmanbaria', 'ব্রাহ্মণবাড়িয়া',
      'noakhali', 'নোয়াখালী', 'chandpur', 'চাঁদপুর', 'lakshmipur', 'লক্ষ্মীপুর',
      'rangamati', 'রাঙ্গামাটি', 'khagrachhari', 'খাগড়াছড়ি', 'bandarban', 'বান্দরবান',
      'sylhet', 'সিলেট', 'moulvibazar', 'মৌলভীবাজার', 'habiganj', 'হবিগঞ্জ', 'sunamganj', 'সুনামগঞ্জ',
      'rajshahi', 'রাজশাহী', 'bogura', 'bogra', 'বগুড়া', 'pabna', 'পাবনা', 'sirajganj', 'সিরাজগঞ্জ',
      'naogaon', 'নওগাঁ', 'natore', 'নাটোর', 'chapainawabganj', 'চাঁপাইনবাবগঞ্জ', 'joypurhat', 'জয়পুরহাট',
      'khulna', 'খুলনা', 'jashore', 'jessore', 'যশোর', 'kushtia', 'কুষ্টিয়া', 'satkhira', 'সাতক্ষীরা',
      'bagerhat', 'বাগেরহাট', 'jhenaidah', 'ঝিনাইদহ', 'chuadanga', 'চুয়াডাঙ্গা', 'magura', 'মাগুরা',
      'meherpur', 'মেহেরপুর', 'narail', 'নড়াইল',
      'barishal', 'barisal', 'বরিশাল', 'patuakhali', 'পটুয়াখালী', 'bhola', 'ভোলা',
      'pirojpur', 'পিরোজপুর', 'barguna', 'বরগুনা', 'jhalokati', 'ঝালকাঠি',
      'rangpur', 'রংপুর', 'dinajpur', 'দিনাজপুর', 'gaibandha', 'গাইবান্ধা', 'kurigram', 'কুড়িগ্রাম',
      'nilphamari', 'নীলফামারী', 'panchagarh', 'পঞ্চগড়', 'lalmonirhat', 'লালমনিরহাট', 'thakurgaon', 'ঠাকুরগাঁও',
      'mymensingh', 'ময়মনসিংহ', 'jamalpur', 'জামালপুর', 'netrokona', 'নেত্রকোণা', 'sherpur', 'শেরপুর',
      'gazipur', 'গাজীপুর', 'narayanganj', 'নারায়ণগঞ্জ', 'tangail', 'টাঙ্গাইল',
      'faridpur', 'ফরিদপুর', 'manikganj', 'মানিকগঞ্জ', 'munshiganj', 'মুন্সীগঞ্জ',
      'narsingdi', 'নরসিংদী', 'gopalganj', 'গোপালগঞ্জ', 'madaripur', 'মাদারীপুর',
      'rajbari', 'রাজবাড়ী', 'shariatpur', 'শরীয়তপুর', 'kishoreganj', 'কিশোরগঞ্জ',
      // Dhaka Sub-urban Courier Out-of-city zones
      'savar', 'সাভার', 'ashulia', 'আশুলিয়া', 'keraniganj', 'কেরানীগঞ্জ',
      'dhamrai', 'ধামরাই', 'dohar', 'দোহার', 'nawabganj', 'নবাবগঞ্জ'
    ];

    const hasOutsideKeyword = outsideDhakaKeywords.some(kw => addrLower.includes(kw));
    const isOutside = zone === 'outside' || hasOutsideKeyword;
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

      // Advance Courier Charge logic
      const advanceCourierEnabled = (storeSettings as any).advanceCourierEnabled !== false;
      const advanceCourierScope = (storeSettings as any).advanceCourierScope || 'OUTSIDE_DHAKA_ONLY';
      const isAdvanceRequiredByScope =
        advanceCourierEnabled &&
        (advanceCourierScope === 'ALL' || (advanceCourierScope === 'OUTSIDE_DHAKA_ONLY' && isOutside));

      let advanceCourierFee = 0;
      if (isAdvanceRequiredByScope && finalShippingCost > 0) {
        if ((storeSettings as any).advanceCourierAmountType === 'FIXED_AMOUNT' && (storeSettings as any).advanceCourierFixedAmount > 0) {
          advanceCourierFee = Number((storeSettings as any).advanceCourierFixedAmount);
        } else {
          advanceCourierFee = finalShippingCost;
        }
      }

      let finalAdvanceAmount = 0;
      let finalAdvanceMethod: string | null = null;
      let finalAdvanceTrxId: string | null = null;
      let isAdvancePaid = false;

      const isCodWithAdvance = paymentMethod === 'COD_WITH_ADVANCE' || (isAdvanceRequiredByScope && paymentMethod === 'COD');

      if (isCodWithAdvance || inputAdvanceAmount !== undefined || inputAdvanceTrxId) {
        finalAdvanceAmount = inputAdvanceAmount !== undefined ? inputAdvanceAmount : advanceCourierFee;
        finalAdvanceMethod = inputAdvancePaymentMethod || (paymentMethod === 'NAGAD' ? 'NAGAD' : 'BKASH');
        finalAdvanceTrxId = inputAdvanceTrxId || trxId || null;
        // Manual advance payments with TrxID start unverified until Admin verifies in portal
        isAdvancePaid = false;
      } else if (paymentMethod === 'BKASH' || paymentMethod === 'NAGAD') {
        // If full prepayment was done directly via bKash/Nagad
        finalAdvanceAmount = totalAmount;
        finalAdvanceMethod = paymentMethod;
        finalAdvanceTrxId = trxId || null;
        isAdvancePaid = false;
      } else {
        // Full regular COD
        finalAdvanceAmount = 0;
      }

      const finalDueAmount = Math.max(0, totalAmount - finalAdvanceAmount);

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
          paymentMethod: isCodWithAdvance ? 'COD_WITH_ADVANCE' : (paymentMethod || 'COD'),
          paymentPhone: paymentPhone || null,
          trxId: trxId || finalAdvanceTrxId || null,
          advanceAmount: finalAdvanceAmount,
          dueAmount: finalDueAmount,
          isAdvanceCourierPaid: isAdvancePaid,
          advancePaymentMethod: finalAdvanceMethod,
          advanceTrxId: finalAdvanceTrxId,
          advancePaymentStatus: isAdvancePaid ? PaymentStatus.UNPAID : PaymentStatus.UNPAID,
          status: OrderStatus.PENDING,
          paymentStatus: paymentMethod === 'COD' || isCodWithAdvance ? PaymentStatus.UNPAID : PaymentStatus.UNPAID,
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
      advanceAmount: orderResult.advanceAmount,
      dueAmount: orderResult.dueAmount,
      customerName: cleanName
    }).catch((err) => console.error('[OrderService] Async order confirmation SMS error:', err));

    // Generate seamless authentication token for guest customer
    let generatedToken: string | null = null;
    let authUserPayload: any = null;

    if (targetUserId) {
      generatedToken = generateToken({
        userId: targetUserId,
        email: normalizedEmail,
        role: Role.customer
      });
      authUserPayload = {
        id: targetUserId,
        name: cleanName,
        email: normalizedEmail,
        phone: cleanPhone,
        address: shippingAddress,
        role: 'customer'
      };
    }

    return {
      ...orderResult,
      autoAccountCreated,
      customerEmail: normalizedEmail,
      token: generatedToken,
      user: authUserPayload
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
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity },
              status: 'ACTIVE'
            }
          });
        }
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

  static async getOrders(userId: string, role: string, includeDeleted: boolean = false) {
    // Background purge expired trashed orders older than 10 days
    OrderService.purgeExpired(10).catch(() => {});

    if (role === 'admin') {
      return prisma.order.findMany({
        where: includeDeleted ? {} : { isDeleted: false },
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

  static async softDelete(orderId: string, userId: string, role: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, isDeleted: false }
    });

    if (!order) {
      throw new AppError('Order not found or already in trash', 404, 'NOT_FOUND');
    }

    if (role !== 'admin' && order.userId !== userId) {
      throw new AppError('Forbidden: You can only delete your own orders', 403, 'FORBIDDEN');
    }

    if (role !== 'admin' && order.status !== OrderStatus.CANCELLED) {
      throw new AppError('Only cancelled orders can be removed from order history', 400, 'CANNOT_DELETE');
    }

    return (prisma.order as any).update({
      where: { id: orderId },
      data: {
        isDeleted: true,
        deletedAt: new Date()
      }
    });
  }

  static async hardDelete(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'NOT_FOUND');
    }

    // Clean up dependent foreign keys safely
    await prisma.transaction.deleteMany({ where: { orderId } }).catch(() => {});
    await prisma.codReconciliation.deleteMany({ where: { orderId } }).catch(() => {});
    await prisma.orderItem.deleteMany({ where: { orderId } }).catch(() => {});

    return prisma.order.delete({
      where: { id: orderId }
    });
  }

  static async restore(orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, isDeleted: true }
    });

    if (!order) {
      throw new AppError('Deleted order not found in trash', 404, 'NOT_FOUND');
    }

    return (prisma.order as any).update({
      where: { id: orderId },
      data: {
        isDeleted: false,
        deletedAt: null
      }
    });
  }

  static async purgeExpired(days: number = 10) {
    try {
      const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const expired = await (prisma.order as any).findMany({
        where: {
          isDeleted: true,
          OR: [
            { deletedAt: { lte: threshold } },
            { deletedAt: null, updatedAt: { lte: threshold } }
          ]
        },
        select: { id: true }
      });

      for (const o of expired) {
        await OrderService.hardDelete(o.id).catch(() => {});
      }
      return expired.length;
    } catch {
      return 0;
    }
  }

  static async purgeAllDeleted() {
    const deletedOrders = await prisma.order.findMany({
      where: { isDeleted: true },
      select: { id: true }
    });

    let count = 0;
    for (const o of deletedOrders) {
      await OrderService.hardDelete(o.id).catch(() => {});
      count++;
    }
    return count;
  }

  static async deleteOrder(orderId: string, userId: string, role: string) {
    return OrderService.softDelete(orderId, userId, role);
  }

  static async verifyAdvancePayment(orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, isDeleted: false },
      include: { user: true }
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        isAdvanceCourierPaid: true,
        advancePaymentStatus: PaymentStatus.PAID,
        status: OrderStatus.CONFIRMED
      },
      include: { items: true, user: true }
    });

    if (order.phone) {
      SmsService.sendAdvanceVerifiedSms({
        phone: order.phone,
        orderId: order.id,
        advanceAmount: order.advanceAmount,
        dueAmount: order.dueAmount,
        customerName: order.user?.name || 'Customer'
      }).catch((err) => console.error('[OrderService] Verify advance SMS error:', err));
    }

    return updated;
  }

  static async rejectAdvancePayment(orderId: string, reason?: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, isDeleted: false }
    });

    if (!order) {
      throw new AppError('Order not found', 404, 'NOT_FOUND');
    }

    return prisma.order.update({
      where: { id: orderId },
      data: {
        isAdvanceCourierPaid: false,
        advancePaymentStatus: PaymentStatus.FAILED,
        cancelReason: reason || 'Advance courier payment verification failed'
      },
      include: { items: true, user: true }
    });
  }
}


