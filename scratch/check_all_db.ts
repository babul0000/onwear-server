import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('=== ALL CATEGORIES IN DB ===');
  const categories = await prisma.category.findMany();
  categories.forEach(c => {
    console.log(`Category [${c.name}] slug: [${c.slug}] image: [${c.image}]`);
  });

  console.log('\n=== ALL PRODUCTS IN DB ===');
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      image: true,
      image2: true,
      description: true
    }
  });
  products.forEach((p, i) => {
    console.log(`${i + 1}. [${p.name}] (id: ${p.id})`);
    console.log(`   image: ${p.image}`);
    console.log(`   image2: ${p.image2}`);
    console.log(`   desc sample: ${p.description?.substring(0, 80)}`);
  });
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
