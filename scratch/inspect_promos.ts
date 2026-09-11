import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const promos = await prisma.promotion.findMany({
    orderBy: { displayOrder: 'asc' }
  });
  console.log('=== ALL PROMOTIONS IN DB ===');
  promos.forEach((p, idx) => {
    console.log(`${idx + 1}. ID: ${p.id}`);
    console.log(`   Title: ${p.title}`);
    console.log(`   Image: ${p.imageUrl}`);
    console.log(`   Link: ${p.linkUrl}`);
    console.log(`   Position: X=${p.positionX}, Y=${p.positionY}`);
    console.log(`   Order: ${p.displayOrder}`);
    console.log(`   Active: ${p.isActive}`);
  });

  const setting = await prisma.storeSetting.findFirst();
  console.log('\n=== STORE SETTING BANNERS ===');
  console.log('Logo:', setting?.logoUrl);
  console.log('Login Banner:', setting?.loginImageUrl);
  console.log('Register Banner:', setting?.registerImageUrl);
  console.log('Lookbook Banner:', setting?.lookbookImageUrl);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
