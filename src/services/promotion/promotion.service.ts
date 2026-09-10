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
          imageUrl: 'https://i.ibb.co/HTB1fbYf/On-Wear-unique-way-of-elegance-1-jpg-2.jpg',
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

    let slides = await (prisma as any).promotion.findMany({
      where: { title: { startsWith: 'Hero Slide' } },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    if (slides.length === 0) {
      const defaults = [
        {
          title: 'Hero Slide 1',
          imageUrl: 'https://i.ibb.co/HTB1fbYf/On-Wear-unique-way-of-elegance-1-jpg-2.jpg',
          linkUrl: '/products?category=shirt',
          positionX: 50,
          positionY: 50,
          displayOrder: 0,
          isActive: true
        },
        {
          title: 'Hero Slide 2',
          imageUrl: 'https://i.ibb.co/FqHjfvxG/Gemini-Generated-Image-ino58qino58qino5.jpg',
          linkUrl: '/products?category=denim',
          positionX: 50,
          positionY: 50,
          displayOrder: 1,
          isActive: true
        },
        {
          title: 'Hero Slide 3',
          imageUrl: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1600',
          linkUrl: '/products?category=winter-collection',
          positionX: 50,
          positionY: 50,
          displayOrder: 2,
          isActive: true
        }
      ];

      await (prisma as any).promotion.createMany({
        data: defaults
      });

      slides = await (prisma as any).promotion.findMany({
        where: { title: { startsWith: 'Hero Slide' } },
        orderBy: { displayOrder: 'asc' }
      });
    }

    await cache.set(SLIDES_CACHE_KEY, slides, 3600);
    return slides;
  }

  static async updateHeroSlides(slides: { id?: string; title: string; imageUrl: string; linkUrl?: string; positionX?: number; positionY?: number }[]) {
    if (!slides || slides.length === 0) {
      throw new Error('At least 1 slide is required');
    }

    // Delete existing slides and recreate in given order to support dynamic slide count (1 to N)
    await (prisma as any).promotion.deleteMany({
      where: { title: { startsWith: 'Hero Slide' } }
    });

    const newSlidesData = slides.map((slide, idx) => ({
      title: slide.title || `Hero Slide ${idx + 1}`,
      imageUrl: slide.imageUrl,
      linkUrl: slide.linkUrl || null,
      positionX: typeof slide.positionX === 'number' ? slide.positionX : 50,
      positionY: typeof slide.positionY === 'number' ? slide.positionY : 50,
      displayOrder: idx,
      isActive: true,
    }));

    await (prisma as any).promotion.createMany({
      data: newSlidesData
    });

    const updated = await (prisma as any).promotion.findMany({
      where: { title: { startsWith: 'Hero Slide' } },
      orderBy: { displayOrder: 'asc' }
    });

    await cache.del(SLIDES_CACHE_KEY);
    return updated;
  }
}

