import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export class OrderService {
  static async checkout(
    userId: string,
    shippingAddress: string,
    phone: string,
    email?: string,
    note?: string,
    couponCode?: string,
    shippingCost?: number,
    discountApplied?: number
  ) {
    if (!shippingAddress || !phone) {
      throw new AppError('Shipping address and phone number are required', 400, 'BAD_REQUEST');
    }

    // 1. Get user cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      throw new AppError('Cannot place an order with an empty cart', 400, 'BAD_REQUEST');
    }

    // 2. Run Transaction
    return prisma.$transaction(async (tx) => {
      let itemsTotal = 0;
      const orderItemsData: any[] = [];

      for (const item of cart.items) {
        // Fetch fresh, locked product row inside the transaction
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product || product.isDeleted || product.status !== 'ACTIVE') {
          throw new AppError(`Product "${item.product.name}" is no longer available`, 400, 'BAD_REQUEST');
        }

        if (product.stock < item.quantity) {
          throw new AppError(
            `Insufficient stock for product "${product.name}". Available: ${product.stock}`,
            400,
            'OUT_OF_STOCK'
          );
        }

        const priceSnap =
          product.discountPrice !== null ? product.discountPrice : product.price;
        const subtotal = priceSnap * item.quantity;
        itemsTotal += subtotal;

        // Reduce stock
        const updatedProduct = await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { decrement: item.quantity }
          }
        });

        // Safely update status if stock reaches 0
        if (updatedProduct.stock === 0) {
          await tx.product.update({
            where: { id: item.productId },
            data: { status: 'OUT_OF_STOCK' }
          });
        }

        orderItemsData.push({
          productId: item.productId,
          productName: item.product.name,
          price: priceSnap,
          quantity: item.quantity,
          subtotal
        });
      }

      // Calculate final total
      const totalAmount = Math.max(0, itemsTotal - (discountApplied || 0) + (shippingCost || 0));

      // Increment coupon usage if coupon code was used
      if (couponCode) {
        await tx.coupon.updateMany({
          where: { code: { equals: couponCode.trim(), mode: 'insensitive' } },
          data: { usedCount: { increment: 1 } }
        });
      }

      // Create Order
      const order = await tx.order.create({
        data: {
          userId,
          totalAmount,
          shippingAddress,
          phone,
          email: email || null,
          note: note || null,
          shippingCost: shippingCost || 0,
          couponCode: couponCode || null,
          discountApplied: discountApplied || 0,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.UNPAID,
          items: {
            create: orderItemsData
          }
        },
        include: {
          items: true
        }
      });

      // Clear Cart Items
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id }
      });

      return order;
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

  static async getGuestOrders(phone: string, orderId?: string) {
    const cleanPhone = phone.trim();
    return prisma.order.findMany({
      where: {
        phone: cleanPhone,
        ...(orderId && { id: orderId.trim() }),
        isDeleted: false
      },
      include: {
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

