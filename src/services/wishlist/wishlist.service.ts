import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';

export class WishlistService {
  static async getWishlist(userId: string) {
    let wishlist = await prisma.wishlist.findUnique({
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

    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
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

    return wishlist;
  }

  static async addItem(userId: string, productId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, isDeleted: false }
    });
    if (!product || product.status !== 'ACTIVE') {
      throw new AppError('Product not found or inactive', 404, 'NOT_FOUND');
    }

    const wishlist = await this.getWishlist(userId);

    const existing = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId
        }
      }
    });

    if (existing) {
      throw new AppError('Product already in wishlist', 409, 'DUPLICATE_RECORD');
    }

    return prisma.wishlistItem.create({
      data: {
        wishlistId: wishlist.id,
        productId
      }
    });
  }

  static async removeItem(userId: string, productId: string) {
    const wishlist = await this.getWishlist(userId);

    const wishlistItem = await prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId
        }
      }
    });

    if (!wishlistItem) {
      throw new AppError('Product not found in wishlist', 404, 'NOT_FOUND');
    }

    return prisma.wishlistItem.delete({
      where: { id: wishlistItem.id }
    });
  }
}
