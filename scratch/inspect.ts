import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- ALL CATEGORIES ---');
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' }
  });
  console.log(JSON.stringify(categories, null, 2));

  console.log('--- PRODUCTS ---');
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      discountPrice: true,
      stock: true,
      sku: true,
      image: true,
      categoryId: true
    },
    orderBy: { name: 'asc' }
  });
  console.log(JSON.stringify(products, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
