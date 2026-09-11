import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      image: true,
      image2: true,
      images: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('=== LATEST 10 PRODUCTS IN DB ===');
  console.log(JSON.stringify(products, null, 2));
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
