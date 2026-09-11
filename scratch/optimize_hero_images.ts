import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../src/config/env';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true
});

const tempDir = path.join(__dirname, 'temp_img');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

async function processImage(imageUrl: string, folder: string, name: string): Promise<{ newUrl: string; origKB: number; optKB: number } | null> {
  const tempFile = path.join(tempDir, `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);
  try {
    console.log(`\n⏳ [${name}] Downloading via curl: ${imageUrl.substring(0, 65)}...`);
    execSync(`curl.exe -s -L "${imageUrl}" -o "${tempFile}"`, { timeout: 30000 });

    if (!fs.existsSync(tempFile)) {
      throw new Error('Downloaded file not found');
    }

    const stats = fs.statSync(tempFile);
    const origKB = stats.size / 1024;
    console.log(`   Downloaded ${origKB.toFixed(1)} KB (${(origKB / 1024).toFixed(2)} MB). Uploading to Cloudinary with WebP compression...`);

    const result = await cloudinary.uploader.upload(tempFile, {
      folder,
      resource_type: 'image',
      format: 'webp',
      transformation: [
        { width: 2560, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
        { flags: 'lossy' }
      ]
    });

    const optKB = result.bytes / 1024;
    const savings = (((origKB - optKB) / (origKB || 1)) * 100).toFixed(1);
    console.log(`   ✨ Optimized: ${optKB.toFixed(1)} KB (${(optKB / 1024).toFixed(2)} MB) - ${savings}% Saved!`);
    console.log(`   🔗 New URL: ${result.secure_url}`);

    return {
      newUrl: result.secure_url,
      origKB,
      optKB
    };
  } catch (err: any) {
    console.error(`   ❌ Failed processing [${name}]:`, err.message);
    return null;
  } finally {
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch {}
    }
  }
}

async function run() {
  console.log('==============================================');
  console.log('  OPTIMIZING HERO SLIDES & BANNERS (WEBP)');
  console.log('==============================================');

  let totalOrigKB = 0;
  let totalOptKB = 0;
  let count = 0;

  // 1. Promotions
  const promotions = await prisma.promotion.findMany();
  for (const promo of promotions) {
    if (promo.imageUrl && promo.imageUrl.includes('ibb.co')) {
      const res = await processImage(promo.imageUrl, 'onwear/hero_slides', promo.title);
      if (res) {
        totalOrigKB += res.origKB;
        totalOptKB += res.optKB;
        count++;

        await prisma.promotion.update({
          where: { id: promo.id },
          data: { imageUrl: res.newUrl }
        });
        console.log(`   ✅ DB updated for Promotion "${promo.title}"`);
      }
    }
  }

  // 2. Store Settings
  const settings = await prisma.storeSetting.findMany();
  for (const s of settings) {
    const updates: any = {};
    if (s.loginImageUrl && s.loginImageUrl.includes('ibb.co')) {
      const res = await processImage(s.loginImageUrl, 'onwear/settings', 'Login Banner');
      if (res) {
        totalOrigKB += res.origKB;
        totalOptKB += res.optKB;
        count++;
        updates.loginImageUrl = res.newUrl;
      }
    }
    if (s.registerImageUrl && s.registerImageUrl.includes('ibb.co')) {
      const res = await processImage(s.registerImageUrl, 'onwear/settings', 'Register Banner');
      if (res) {
        totalOrigKB += res.origKB;
        totalOptKB += res.optKB;
        count++;
        updates.registerImageUrl = res.newUrl;
      }
    }
    if (s.lookbookImageUrl && s.lookbookImageUrl.includes('ibb.co')) {
      const res = await processImage(s.lookbookImageUrl, 'onwear/settings', 'Lookbook Banner');
      if (res) {
        totalOrigKB += res.origKB;
        totalOptKB += res.optKB;
        count++;
        updates.lookbookImageUrl = res.newUrl;
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.storeSetting.update({
        where: { id: s.id },
        data: updates
      });
      console.log(`   ✅ DB updated for Store Setting banners`);
    }
  }

  // Clean tempDir
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  } catch {}

  console.log('\n==============================================');
  console.log('  🎉 OPTIMIZATION COMPLETED SUCCESSFULLY 🎉');
  console.log('==============================================');
  console.log(`Total Optimized Images: ${count}`);
  console.log(`Before Total Size: ${(totalOrigKB / 1024).toFixed(2)} MB`);
  console.log(`After Total Size:  ${(totalOptKB / 1024).toFixed(2)} MB`);
  const savings = (((totalOrigKB - totalOptKB) / (totalOrigKB || 1)) * 100).toFixed(1);
  console.log(`Net Bandwidth & Storage Saved: ${savings}% 🚀`);
  console.log('==============================================\n');
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
