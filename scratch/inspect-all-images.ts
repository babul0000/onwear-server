import { PrismaClient } from '@prisma/client';
import http from 'http';
import https from 'https';

const prisma = new PrismaClient();

async function checkUrl(url: string): Promise<{ ok: boolean; status: number; durationMs: number; sizeBytes: number; contentType?: string }> {
  const start = Date.now();
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
        let size = 0;
        const contentLength = res.headers['content-length'];
        const contentType = res.headers['content-type'];
        if (contentLength) {
          size = parseInt(contentLength, 10);
        }
        res.on('data', (chunk) => {
          if (!contentLength) size += chunk.length;
        });
        res.on('end', () => {
          resolve({
            ok: res.statusCode === 200,
            status: res.statusCode || 0,
            durationMs: Date.now() - start,
            sizeBytes: size,
            contentType
          });
        });
      });
      req.on('error', () => {
        resolve({ ok: false, status: 0, durationMs: Date.now() - start, sizeBytes: 0 });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, status: 408, durationMs: Date.now() - start, sizeBytes: 0 });
      });
    } catch {
      resolve({ ok: false, status: 0, durationMs: Date.now() - start, sizeBytes: 0 });
    }
  });
}

async function main() {
  console.log('--- PRODUCTS ---');
  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true, image: true, image2: true }
  });
  for (const prod of products) {
    if (prod.image) {
      const res = await checkUrl(prod.image);
      console.log(`[Product] "${prod.name}" img1: ${prod.image} -> ${res.status} (${res.durationMs}ms, ${(res.sizeBytes/1024).toFixed(1)} KB, ${res.contentType})`);
    }
    if (prod.image2) {
      const res2 = await checkUrl(prod.image2);
      console.log(`[Product] "${prod.name}" img2: ${prod.image2} -> ${res2.status} (${res2.durationMs}ms, ${(res2.sizeBytes/1024).toFixed(1)} KB, ${res2.contentType})`);
    }
  }

  console.log('--- CATEGORIES ---');
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, image: true }
  });
  for (const cat of categories) {
    if (cat.image) {
      const res = await checkUrl(cat.image);
      console.log(`[Category] "${cat.name}": ${cat.image} -> ${res.status} (${res.durationMs}ms, ${(res.sizeBytes/1024).toFixed(1)} KB, ${res.contentType})`);
    }
  }

  console.log('--- STORE SETTING ---');
  const setting = await prisma.storeSetting.findFirst();
  if (setting) {
    console.log('logoUrl:', setting.logoUrl);
    console.log('lookbookImageUrl:', setting.lookbookImageUrl);
    if (setting.lookbookImageUrl) {
      const res = await checkUrl(setting.lookbookImageUrl);
      console.log(`[Lookbook]: ${setting.lookbookImageUrl} -> ${res.status} (${res.durationMs}ms, ${(res.sizeBytes/1024).toFixed(1)} KB)`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
