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
          imageUrl: 'https://res.cloudinary.com/lgmh6vly/image/upload/v1789142084/onwear/hero_slides/gzm6j166gp64fcxcv0se.webp',
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

    let slides = await prisma.promotion.findMany({
      where: { title: { not: 'Hero Cover Photo' } },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    if (slides.length === 0) {
      const defaults = [
        {
          title: 'Hero Slide 1',
          imageUrl: 'https://res.cloudinary.com/lgmh6vly/image/upload/v1789142084/onwear/hero_slides/gzm6j166gp64fcxcv0se.webp',
          linkUrl: '/products?category=shirt',
          positionX: 50,
          positionY: 50,
          displayOrder: 0,
          isActive: true
        },
        {
          title: 'Hero Slide 2',
          imageUrl: 'https://res.cloudinary.com/lgmh6vly/image/upload/v1789142108/onwear/hero_slides/k1wzl2izqkjqlkuur1y3.webp',
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

      await prisma.promotion.createMany({
        data: defaults
      });

      slides = await prisma.promotion.findMany({
        where: { title: { not: 'Hero Cover Photo' } },
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

    // Delete all existing hero slides (except legacy single banner)
    await prisma.promotion.deleteMany({
      where: { title: { not: 'Hero Cover Photo' } }
    });

    const newSlidesData = slides.map((slide, idx) => ({
      title: slide.title?.trim() || `Hero Slide ${idx + 1}`,
      imageUrl: slide.imageUrl,
      linkUrl: slide.linkUrl || null,
      positionX: typeof slide.positionX === 'number' ? slide.positionX : 50,
      positionY: typeof slide.positionY === 'number' ? slide.positionY : 50,
      displayOrder: idx,
      isActive: true,
    }));

    await prisma.promotion.createMany({
      data: newSlidesData
    });

    // Also sync the primary Hero Cover Photo with slide 1 for backward compatibility
    if (newSlidesData.length > 0) {
      const cover = await prisma.promotion.findFirst({
        where: { title: 'Hero Cover Photo' }
      });
      if (cover) {
        await prisma.promotion.update({
          where: { id: cover.id },
          data: {
            imageUrl: newSlidesData[0].imageUrl,
            positionX: newSlidesData[0].positionX,
            positionY: newSlidesData[0].positionY
          }
        });
      } else {
        await prisma.promotion.create({
          data: {
            title: 'Hero Cover Photo',
            imageUrl: newSlidesData[0].imageUrl,
            positionX: newSlidesData[0].positionX,
            positionY: newSlidesData[0].positionY,
            isActive: true
          }
        });
      }
    }

    const updated = await prisma.promotion.findMany({
      where: { title: { not: 'Hero Cover Photo' } },
      orderBy: { displayOrder: 'asc' }
    });

    await cache.del(SLIDES_CACHE_KEY);
    await cache.del(BANNER_CACHE_KEY);
    return updated;
  }
}

