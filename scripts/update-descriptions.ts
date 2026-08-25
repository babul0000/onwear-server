import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const productDataUpdates = [
  {
    sku: 'CLOTH-SHIRT-01',
    description: "Premium slim fit oxford cotton shirt. Made from high-quality combed cotton for maximum comfort and durability.\n\nSizes: S, M, L, XL\nColors: Blue, White, Grey"
  },
  {
    sku: 'CLOTH-SHIRT-02',
    description: "Lightweight and breathable classic linen button-down shirt. Perfect for hot summer days and semi-formal wear.\n\nSizes: M, L, XL\nColors: White, Beige"
  },
  {
    sku: 'CLOTH-SHIRT-03',
    description: "Classic plaid vintage check flannel shirt. Warm, cozy, and double-brushed for soft texture.\n\nSizes: S, M, L, XL\nColors: Red, Navy"
  },
  {
    sku: 'CLOTH-PANTS-01',
    description: "Slim fit stretch chino pants. Built with active-stretch cotton twill for comfort during long days.\n\nSizes: 30, 32, 34\nColors: Beige, Khaki, Black"
  },
  {
    sku: 'CLOTH-PANTS-02',
    description: "Relaxed fit cargo jogger pants. Features functional multi-pockets, cuffed ankles, and a soft drawstring waist.\n\nSizes: 28, 30, 32\nColors: Olive, Black"
  },
  {
    sku: 'CLOTH-PANTS-03',
    description: "Premium tailored slim dress trousers. Features a wrinkle-resistant finish and structured classic fit.\n\nSizes: 30, 32, 34\nColors: Grey, Black"
  },
  {
    sku: 'CLOTH-TEE-01',
    description: "Everyday basic organic cotton crewneck t-shirt. Sustainably sourced, pre-shrunk, and ultra-soft.\n\nSizes: S, M, L, XL\nColors: White, Black"
  },
  {
    sku: 'CLOTH-TEE-02',
    description: "Heavyweight graphic printed cotton tee. Relaxed drop-shoulder fit with a premium screen-printed design.\n\nSizes: M, L, XL\nColors: Black, Grey"
  },
  {
    sku: 'CLOTH-TEE-03',
    description: "Everyday V-neck tee made from light combed cotton. Clean design that works as an undershirt or outer layer.\n\nSizes: S, M, L, XL\nColors: White, Navy"
  },
  {
    sku: 'CLOTH-DENIM-01',
    description: "Classic straight fit denim jeans. Heavyweight raw-denim twill that forms to your fit over time.\n\nSizes: 30, 32, 34\nColors: Blue, Denim"
  },
  {
    sku: 'CLOTH-DENIM-02',
    description: "Vintage distressed denim rider jacket. Features classic button closures, chest pockets, and a worn-in retro look.\n\nSizes: M, L, XL\nColors: Denim, Grey"
  },
  {
    sku: 'CLOTH-DENIM-03',
    description: "Indigo workwear denim overshirt. Can be worn buttoned up or open as a light jacket over a t-shirt.\n\nSizes: S, M, L, XL\nColors: Blue, Denim"
  },
  {
    sku: 'CLOTH-CAP-01',
    description: "Premium embroidered baseball cap with adjustable metal slider buckle. Made from durable cotton canvas.\n\nColors: Black, Navy, Red"
  },
  {
    sku: 'CLOTH-CAP-02',
    description: "Minimalist solid cotton dad hat with a pre-curved brim and unstructured fit.\n\nColors: Beige, White"
  },
  {
    sku: 'CLOTH-SANDAL-01',
    description: "Genuine leather slide sandals. Built with soft leather straps and a cushioned footbed for premium support.\n\nSizes: 40, 41, 42\nColors: Brown, Black"
  },
  {
    sku: 'CLOTH-SANDAL-02',
    description: "Comfort everyday cork footbed sandals with dual adjustable straps and natural cork support.\n\nSizes: 40, 41, 42\nColors: Brown, Beige"
  }
];

async function main() {
  console.log('Starting product description updates...');
  for (const update of productDataUpdates) {
    const updated = await prisma.product.updateMany({
      where: { sku: update.sku },
      data: { description: update.description }
    });
    console.log(`Updated product SKU: ${update.sku} (${updated.count} row(s))`);
  }
  console.log('Finished updates successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
