import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const productImagesUpdates = [
  {
    sku: 'CLOTH-SHIRT-01',
    image2: 'https://images.unsplash.com/photo-1589310243389-96a5483213a8?q=80&w=400'
  },
  {
    sku: 'CLOTH-SHIRT-02',
    image2: 'https://images.unsplash.com/photo-1621072156002-e2fcc103e86e?q=80&w=400'
  },
  {
    sku: 'CLOTH-SHIRT-03',
    image2: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?q=80&w=400'
  },
  {
    sku: 'CLOTH-PANTS-01',
    image2: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=400'
  },
  {
    sku: 'CLOTH-PANTS-02',
    image2: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400'
  },
  {
    sku: 'CLOTH-PANTS-03',
    image2: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=400'
  },
  {
    sku: 'CLOTH-TEE-01',
    image2: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=400'
  },
  {
    sku: 'CLOTH-TEE-02',
    image2: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=400'
  },
  {
    sku: 'CLOTH-TEE-03',
    image2: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=400'
  },
  {
    sku: 'CLOTH-DENIM-01',
    image2: 'https://images.unsplash.com/photo-1582552938357-32b906df43c3?q=80&w=400'
  },
  {
    sku: 'CLOTH-DENIM-02',
    image2: 'https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?q=80&w=400'
  },
  {
    sku: 'CLOTH-DENIM-03',
    image2: 'https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?q=80&w=400'
  },
  {
    sku: 'CLOTH-CAP-01',
    image2: 'https://images.unsplash.com/photo-1534215754734-18e55d13e346?q=80&w=400'
  },
  {
    sku: 'CLOTH-CAP-02',
    image2: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=400'
  },
  {
    sku: 'CLOTH-SANDAL-01',
    image2: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?q=80&w=400'
  },
  {
    sku: 'CLOTH-SANDAL-02',
    image2: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=400'
  }
];

async function main() {
  console.log('Starting product image2 updates...');
  for (const update of productImagesUpdates) {
    const updated = await prisma.product.updateMany({
      where: { sku: update.sku },
      data: { image2: update.image2 }
    });
    console.log(`Updated product SKU: ${update.sku} set image2 (${updated.count} row(s))`);
  }
  console.log('Finished image2 updates successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
