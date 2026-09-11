import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../src/config/env';

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true
});

async function getUrlSize(url: string): Promise<{ sizeBytes: number; status: number; contentType: string }> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3500)
    });
    const contentLength = res.headers.get('content-length');
    const contentType = res.headers.get('content-type') || '';
    if (contentLength) {
      return { sizeBytes: parseInt(contentLength, 10), status: res.status, contentType };
    }
    const buf = await res.arrayBuffer();
    return { sizeBytes: buf.byteLength, status: res.status, contentType };
  } catch (err: any) {
    return { sizeBytes: 0, status: 0, contentType: err.message || 'error' };
  }
}

async function checkCloudinaryUsage() {
  try {
    const usage = await cloudinary.api.usage();
    console.log('=== CLOUDINARY ACCOUNT USAGE ===');
    console.log(`Plan: ${usage.plan}`);
    console.log(`Storage Used: ${(usage.storage.usage / (1024 * 1024)).toFixed(2)} MB`);
    console.log(`Total Objects: ${usage.objects.usage}`);
    console.log(`Bandwidth Used: ${(usage.bandwidth.usage / (1024 * 1024)).toFixed(2)} MB\n`);
  } catch (err: any) {
    console.log('Cloudinary usage API note:', err.message);
  }
}

async function checkCloudinaryResources() {
  try {
    console.log('=== CLOUDINARY ASSETS IN "onwear" ===');
    const res = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'onwear',
      max_results: 500
    });
    let totalBytes = 0;
    console.log(`Total Assets in "onwear" folder: ${res.resources.length}`);
    res.resources.forEach((r: any, idx: number) => {
      totalBytes += r.bytes;
      console.log(`${idx + 1}. [${r.public_id}] -> ${(r.bytes / 1024).toFixed(1)} KB | Format: ${r.format} | Resolution: ${r.width}x${r.height}`);
    });
    console.log(`Cloudinary "onwear" Total Size: ${(totalBytes / 1024).toFixed(1)} KB (${(totalBytes / (1024 * 1024)).toFixed(2)} MB)\n`);
  } catch (err: any) {
    console.log('Cloudinary resources list note:', err.message);
  }
}

async function checkDatabaseImages() {
  console.log('=== DATABASE IMAGES AUDIT ===');
  const rawItems: { category: string; name: string; field: string; url: string }[] = [];

  // Products
  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true, image: true, image2: true, images: true }
  });

  for (const p of products) {
    if (p.image) {
      rawItems.push({ category: 'Product', name: p.name, field: 'Main Image', url: p.image });
    }
    if (p.image2) {
      rawItems.push({ category: 'Product', name: p.name, field: 'Hover Image', url: p.image2 });
    }
    if (p.images && p.images.length > 0) {
      for (let i = 0; i < p.images.length; i++) {
        const imgUrl = p.images[i];
        if (imgUrl && imgUrl !== p.image && imgUrl !== p.image2) {
          rawItems.push({ category: 'Product', name: p.name, field: `Gallery [${i + 1}]`, url: imgUrl });
        }
      }
    }
  }

  // Categories
  const categories = await prisma.category.findMany();
  for (const c of categories) {
    if (c.image) {
      rawItems.push({ category: 'Category', name: c.name, field: 'Image', url: c.image });
    }
  }

  // Promotions / Slides
  const promotions = await prisma.promotion.findMany();
  for (const promo of promotions) {
    if (promo.imageUrl) {
      rawItems.push({ category: 'Promotion', name: promo.title, field: 'Image', url: promo.imageUrl });
    }
  }

  // Store Setting
  const setting = await prisma.storeSetting.findFirst();
  if (setting) {
    if (setting.logoUrl) {
      rawItems.push({ category: 'Store Setting', name: 'Site Logo', field: 'logoUrl', url: setting.logoUrl });
    }
    if (setting.loginImageUrl) {
      rawItems.push({ category: 'Store Setting', name: 'Login Banner', field: 'loginImageUrl', url: setting.loginImageUrl });
    }
    if (setting.registerImageUrl) {
      rawItems.push({ category: 'Store Setting', name: 'Register Banner', field: 'registerImageUrl', url: setting.registerImageUrl });
    }
    if (setting.lookbookImageUrl) {
      rawItems.push({ category: 'Store Setting', name: 'Lookbook Banner', field: 'lookbookImageUrl', url: setting.lookbookImageUrl });
    }
  }

  const results = await Promise.all(
    rawItems.map(async (item) => {
      const res = await getUrlSize(item.url);
      return {
        ...item,
        sizeKB: res.sizeBytes / 1024,
        contentType: res.contentType
      };
    })
  );

  let totalSizeKB = 0;
  console.log('| # | Type | Item Name | Field | Size | URL |');
  console.log('|---|---|---|---|---|---|');
  results.forEach((it, idx) => {
    totalSizeKB += it.sizeKB;
    const sizeStr = it.sizeKB > 1024 ? `${(it.sizeKB / 1024).toFixed(2)} MB` : `${it.sizeKB.toFixed(1)} KB`;
    console.log(`| ${idx + 1} | ${it.category} | ${it.name} | ${it.field} | ${sizeStr} | ${it.url.length > 60 ? it.url.substring(0, 57) + '...' : it.url} |`);
  });

  console.log(`\n----------------------------------------`);
  console.log(`Total Database Images: ${results.length}`);
  console.log(`Total Image Size: ${totalSizeKB.toFixed(1)} KB (${(totalSizeKB / 1024).toFixed(2)} MB)`);
  console.log(`Average Size: ${(totalSizeKB / (results.length || 1)).toFixed(1)} KB`);
  console.log(`----------------------------------------\n`);
}

async function main() {
  await checkCloudinaryUsage();
  await checkCloudinaryResources();
  await checkDatabaseImages();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
