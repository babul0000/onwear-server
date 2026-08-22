import { prisma } from '../../lib/prisma';

export class PromotionService {
  static async getHeroBanner() {
    let banner = await prisma.promotion.findFirst({
      where: { title: 'Hero Cover Photo' }
    });

    if (!banner) {
      // Create default
      banner = await prisma.promotion.create({
        data: {
          title: 'Hero Cover Photo',
          imageUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=1600',
          isActive: true
        }
      });
    }

    return banner;
  }

  static async updateHeroBanner(imageUrl: string) {
    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    const banner = await prisma.promotion.findFirst({
      where: { title: 'Hero Cover Photo' }
    });

    if (!banner) {
      return prisma.promotion.create({
        data: {
          title: 'Hero Cover Photo',
          imageUrl,
          isActive: true
        }
      });
    }

    return prisma.promotion.update({
      where: { id: banner.id },
      data: { imageUrl }
    });
  }
}
