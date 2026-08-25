import { PrismaClient } from '@prisma/client';
import http from 'http';
import https from 'https';

const prisma = new PrismaClient();

function checkUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        resolve(res.statusCode === 200);
      }).on('error', () => {
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

async function main() {
  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true, image: true }
  });

  console.log('Checking images for products...');
  for (const prod of products) {
    if (!prod.image) {
      console.log(`❌ Product "${prod.name}" has no image`);
      continue;
    }
    const ok = await checkUrl(prod.image);
    console.log(`${ok ? '✅' : '❌'} Product "${prod.name}": ${prod.image}`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
