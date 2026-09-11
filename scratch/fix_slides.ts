import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const slides = await prisma.promotion.findMany({
    where: { title: { startsWith: 'Hero Slide' } }
  });
  console.log('Current slides in DB:', slides);

  const updated = await prisma.promotion.updateMany({
    where: {
      OR: [
        { imageUrl: { contains: 'p7ik1p7ik1p7ik1p' } },
        { title: 'Hero Slide 3' }
      ]
    },
    data: {
      imageUrl: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1600'
    }
  });

  console.log('Updated rows:', updated.count);

  const finalSlides = await prisma.promotion.findMany({
    where: { title: { startsWith: 'Hero Slide' } }
  });
  console.log('Final slides in DB:', finalSlides);
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
