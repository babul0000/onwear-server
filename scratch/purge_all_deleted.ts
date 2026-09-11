import { ProductService } from '../src/services/product/product.service';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('=== PURGING ALL SOFT-DELETED PRODUCTS ===');
  const count = await ProductService.purgeAllDeleted();
  console.log(`✅ Successfully hard-deleted ${count} soft-deleted products from the database.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
