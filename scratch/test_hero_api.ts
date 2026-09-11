import { PromotionService } from '../src/services/promotion/promotion.service';
import { prisma } from '../src/lib/prisma';

async function test() {
  console.log('--- TESTING GET HERO SLIDES ---');
  const getRes = await PromotionService.getHeroSlides();
  console.log('getHeroSlides count:', getRes.length);
  console.log('First slide:', getRes[0]);

  console.log('\n--- TESTING UPDATE HERO SLIDES WITH POSITIONING ---');
  const updateData = [
    {
      title: 'Hero Slide 1',
      imageUrl: 'https://res.cloudinary.com/lgmh6vly/image/upload/v1789142084/onwear/hero_slides/gzm6j166gp64fcxcv0se.webp',
      linkUrl: '/products?category=shirt',
      positionX: 50,
      positionY: 20
    },
    {
      title: 'Hero Slide 2',
      imageUrl: 'https://res.cloudinary.com/lgmh6vly/image/upload/v1789142108/onwear/hero_slides/k1wzl2izqkjqlkuur1y3.webp',
      linkUrl: '/products?category=denim',
      positionX: 50,
      positionY: 50
    },
    {
      title: 'Hero Slide 3',
      imageUrl: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1600',
      linkUrl: '/products?category=winter-collection',
      positionX: 50,
      positionY: 50
    }
  ];

  const updated = await PromotionService.updateHeroSlides(updateData);
  console.log('Updated slides count:', updated.length);
  console.log('Updated first slide position:', { X: updated[0].positionX, Y: updated[0].positionY });
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
