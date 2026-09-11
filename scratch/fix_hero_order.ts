import { PrismaClient } from '@prisma/client';
import { cache } from '../src/utils/cache';

const prisma = new PrismaClient();

const HERO_1_IMG = 'https://res.cloudinary.com/lgmh6vly/image/upload/v1789142084/onwear/hero_slides/gzm6j166gp64fcxcv0se.webp';
const HERO_2_IMG = 'https://res.cloudinary.com/lgmh6vly/image/upload/v1789142108/onwear/hero_slides/k1wzl2izqkjqlkuur1y3.webp';
const HERO_3_IMG = 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1600';

async function fixHeroBannerOrder() {
  console.log('=== RESETTING & FIXING HERO SLIDES ORDER & POSITIONS ===\n');

  // 1. Delete old promo hero slides
  await prisma.promotion.deleteMany({
    where: { title: { startsWith: 'Hero Slide' } }
  });

  // 2. Re-create in perfect sequence
  const correctSlides = [
    {
      title: 'Hero Slide 1',
      imageUrl: HERO_1_IMG,
      linkUrl: '/products?category=shirt',
      positionX: 50,
      positionY: 50,
      displayOrder: 0,
      isActive: true
    },
    {
      title: 'Hero Slide 2',
      imageUrl: HERO_2_IMG,
      linkUrl: '/products?category=denim',
      positionX: 50,
      positionY: 50,
      displayOrder: 1,
      isActive: true
    },
    {
      title: 'Hero Slide 3',
      imageUrl: HERO_3_IMG,
      linkUrl: '/products?category=winter-collection',
      positionX: 50,
      positionY: 50,
      displayOrder: 2,
      isActive: true
    }
  ];

  await prisma.promotion.createMany({
    data: correctSlides
  });

  // 3. Fix Hero Cover Photo
  const existingCover = await prisma.promotion.findFirst({
    where: { title: 'Hero Cover Photo' }
  });
  if (existingCover) {
    await prisma.promotion.update({
      where: { id: existingCover.id },
      data: {
        imageUrl: HERO_1_IMG,
        displayOrder: 0,
        isActive: true
      }
    });
  } else {
    await prisma.promotion.create({
      data: {
        title: 'Hero Cover Photo',
        imageUrl: HERO_1_IMG,
        displayOrder: 0,
        isActive: true
      }
    });
  }

  // 4. Invalidate Cache
  await cache.del('promotions:hero:banner');
  await cache.del('promotions:hero:slides');

  const finalSlides = await prisma.promotion.findMany({
    where: { title: { startsWith: 'Hero Slide' } },
    orderBy: { displayOrder: 'asc' }
  });

  console.log('✅ Final Ordered Slides in Database:');
  finalSlides.forEach((s, i) => {
    console.log(`Slide ${i + 1}: ${s.title} | Order: ${s.displayOrder} | URL: ${s.imageUrl.substring(0, 60)}...`);
  });
}

fixHeroBannerOrder()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
