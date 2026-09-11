import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.product.findMany({
    where: { isDeleted: true },
    select: { id: true, name: true, slug: true, sku: true }
  });
  console.log(`Found ${deleted.length} soft-deleted products:`);
  deleted.forEach((d, i) => console.log(`${i + 1}. [${d.name}] (SKU: ${d.sku}, ID: ${d.id})`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
