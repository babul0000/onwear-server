import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HERO_1_OPTIMIZED = 'https://res.cloudinary.com/lgmh6vly/image/upload/v1789142084/onwear/hero_slides/gzm6j166gp64fcxcv0se.webp';
const HERO_2_OPTIMIZED = 'https://res.cloudinary.com/lgmh6vly/image/upload/v1789142108/onwear/hero_slides/k1wzl2izqkjqlkuur1y3.webp';

async function applyOptimizations() {
  console.log('=== APPLYING OPTIMIZED WEBP URLS TO PROMOTIONS & SETTINGS ===\n');

  // 1. Promotions
  const p1 = await prisma.promotion.updateMany({
    where: {
      OR: [
        { title: { contains: 'Hero Slide 1' } },
        { imageUrl: { contains: 'HTB1fbYf' } },
        { imageUrl: { contains: 'JFgJBFFM' } }
      ]
    },
    data: { imageUrl: HERO_1_OPTIMIZED }
  });
  console.log(`Updated ${p1.count} promotion(s) to Hero 1 Optimized WebP (${HERO_1_OPTIMIZED})`);

  const p2 = await prisma.promotion.updateMany({
    where: {
      OR: [
        { title: { contains: 'Hero Slide 2' } },
        { imageUrl: { contains: 'FqHjfvxG' } }
      ]
    },
    data: { imageUrl: HERO_2_OPTIMIZED }
  });
  console.log(`Updated ${p2.count} promotion(s) to Hero 2 Optimized WebP (${HERO_2_OPTIMIZED})`);

  // 2. Store Settings
  const settings = await prisma.storeSetting.findMany();
  for (const s of settings) {
    await prisma.storeSetting.update({
      where: { id: s.id },
      data: {
        loginImageUrl: HERO_1_OPTIMIZED,
        registerImageUrl: HERO_2_OPTIMIZED,
        lookbookImageUrl: s.lookbookImageUrl && s.lookbookImageUrl.includes('FqHjfvxG') ? HERO_2_OPTIMIZED : s.lookbookImageUrl
      }
    });
    console.log(`Updated Store Settings (${s.id}) with optimized WebP URLs.`);
  }

  console.log('\n✅ All Database Records Updated Successfully!');
}

applyOptimizations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
