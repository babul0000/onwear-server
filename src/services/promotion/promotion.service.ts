import { prisma } from '../../lib/prisma';
import { cache } from '../../utils/cache';

const BANNER_CACHE_KEY = 'promotions:hero:banner';
const SLIDES_CACHE_KEY = 'promotions:hero:slides';

export class PromotionService {
  static async getHeroBanner() {
    const cached = await cache.get<any>(BANNER_CACHE_KEY);
    if (cached) return cached;

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

    await cache.set(BANNER_CACHE_KEY, banner, 3600);
    return banner;
  }

  static async updateHeroBanner(imageUrl: string) {
    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    const banner = await prisma.promotion.findFirst({
      where: { title: 'Hero Cover Photo' }
    });

    let result;
    if (!banner) {
      result = await prisma.promotion.create({
        data: {
          title: 'Hero Cover Photo',
          imageUrl,
          isActive: true
        }
      });
    } else {
      result = await prisma.promotion.update({
        where: { id: banner.id },
        data: { imageUrl }
      });
    }

    await cache.del(BANNER_CACHE_KEY);
    return result;
  }

  static async getHeroSlides() {
    const cached = await cache.get<any[]>(SLIDES_CACHE_KEY);
    if (cached) return cached;

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

    await cache.set(SLIDES_CACHE_KEY, slides, 3600);
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
    const result = await prisma.$transaction(updates);
    await cache.del(SLIDES_CACHE_KEY);
    return result;
  }
}

