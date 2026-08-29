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

  static async getHeroSlides() {
    const titles = ['Hero Slide 1', 'Hero Slide 2', 'Hero Slide 3'];
    let slides = await prisma.promotion.findMany({
      where: { title: { in: titles } },
      orderBy: { title: 'asc' }
    });

    if (slides.length < 3) {
      const defaults = [
        {
          title: 'Hero Slide 1',
          imageUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=1600',
          linkUrl: '/products?category=shirt',
          isActive: true
        },
        {
          title: 'Hero Slide 2',
          imageUrl: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?q=80&w=1600',
          linkUrl: '/products?category=denim',
          isActive: true
        },
        {
          title: 'Hero Slide 3',
          imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1600',
          linkUrl: '/products?category=winter-collection',
          isActive: true
        }
      ];

      await prisma.promotion.deleteMany({
        where: { title: { in: titles } }
      });

      await prisma.promotion.createMany({
        data: defaults
      });

      slides = await prisma.promotion.findMany({
        where: { title: { in: titles } },
        orderBy: { title: 'asc' }
      });
    }

    return slides;
  }

  static async updateHeroSlides(slides: { id: string; title: string; imageUrl: string; linkUrl: string }[]) {
    const updates = slides.map(slide => {
      return prisma.promotion.update({
        where: { id: slide.id },
        data: {
          title: slide.title,
          imageUrl: slide.imageUrl,
          linkUrl: slide.linkUrl || null
        }
      });
    });
    return prisma.$transaction(updates);
  }
}

