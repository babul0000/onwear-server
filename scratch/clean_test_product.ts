import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const deleted = await prisma.product.deleteMany({
    where: {
      OR: [
        { name: 'amittttttt' },
        { slug: 'amitc' },
        { image: { contains: 'q4apgsq4apgsq4ap' } }
      ]
    }
  });
  console.log(`Deleted test products: ${deleted.count}`);
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
