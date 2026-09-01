import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';

export class CartService {
  static async getCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                discountPrice: true,
                stock: true,
                image: true,
                status: true,
                isDeleted: true
              }
            }
          }
        }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  price: true,
                  discountPrice: true,
                  stock: true,
                  image: true,
                  status: true,
                  isDeleted: true
                }
              }
            }
          }
        }
      });
    }

    return cart;
  }

  static async addItem(userId: string, productId: string, quantity: number, size?: string, color?: string) {
    if (quantity < 1) {
      throw new AppError('Quantity must be at least 1', 400, 'BAD_REQUEST');
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isDeleted: false }
    });
    if (!product || product.status !== 'ACTIVE') {
      throw new AppError('Product is not active or does not exist', 404, 'NOT_FOUND');
    }

    if (product.stock < quantity) {
      throw new AppError(`Only ${product.stock} items left in stock`, 400, 'OUT_OF_STOCK');
    }

    const cart = await this.getCart(userId);

    const normSize = size?.trim() || null;
    const normColor = color?.trim() || null;

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        size: normSize,
        color: normColor
      }
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.stock < newQuantity) {
        throw new AppError(
          `Only ${product.stock} items left in stock. You already have ${existingItem.quantity} in your cart.`,
          400,
          'OUT_OF_STOCK'
        );
      }

      return prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity }
      });
    }

    return prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity,
        size: normSize,
        color: normColor
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            discountPrice: true,
            stock: true,
            image: true,
            status: true,
            isDeleted: true
          }
        }
      }
    });
  }

  static async updateItem(userId: string, cartItemId: string, quantity: number) {
    if (quantity < 1) {
      throw new AppError('Quantity must be at least 1', 400, 'BAD_REQUEST');
    }

    const cart = await this.getCart(userId);

    const cartItem = await prisma.cartItem.findFirst({
      where: { id: cartItemId, cartId: cart.id },
      include: { product: true }
    });

    if (!cartItem) {
      throw new AppError('Cart item not found', 404, 'NOT_FOUND');
    }

    if (cartItem.product.isDeleted || cartItem.product.status !== 'ACTIVE') {
      throw new AppError('Product is no longer available', 400, 'BAD_REQUEST');
    }

    if (cartItem.product.stock < quantity) {
      throw new AppError(`Only ${cartItem.product.stock} items left in stock`, 400, 'OUT_OF_STOCK');
    }

    return prisma.cartItem.update({
      where: { id: cartItemId },
      data: { quantity }
    });
  }

  static async removeItem(userId: string, cartItemId: string) {
    const cart = await this.getCart(userId);

    const cartItem = await prisma.cartItem.findFirst({
      where: { id: cartItemId, cartId: cart.id }
    });

    if (!cartItem) {
      throw new AppError('Cart item not found', 404, 'NOT_FOUND');
    }

    return prisma.cartItem.delete({
      where: { id: cartItemId }
    });
  }

  static async clearCart(userId: string) {
    const cart = await this.getCart(userId);

    return prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    });
  }
}
