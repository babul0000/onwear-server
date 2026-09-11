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
      image2: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total Products: ${products.length}`);
  products.forEach((p, idx) => {
    console.log(`${idx + 1}. [${p.name}] image: ${p.image} | image2: ${p.image2}`);
  });
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
