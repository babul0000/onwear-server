import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const promotions = await prisma.promotion.findMany();
  console.log('=== PROMOTIONS IN DB ===');
  console.log(JSON.stringify(promotions, null, 2));

  const settings = await prisma.siteSettings.findMany();
  console.log('=== SITE SETTINGS IN DB ===');
  console.log(JSON.stringify(settings, null, 2));
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
