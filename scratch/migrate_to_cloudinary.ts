import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../src/config/env';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true
});

const prisma = new PrismaClient();

async function uploadUrlToCloudinary(url: string, folder: string = 'onwear/products'): Promise<string> {
  if (!url || !url.includes('ibb.co')) return url;
  try {
    console.log(`Uploading ${url} to Cloudinary...`);
    const result = await cloudinary.uploader.upload(url, {
      folder,
      resource_type: 'image',
      format: 'webp',
      quality: 'auto:good'
    });
    console.log(`-> Uploaded: ${result.secure_url}`);
    return result.secure_url;
  } catch (err: any) {
    console.error(`Failed to upload ${url} to Cloudinary:`, err.message);
    return url;
  }
}

async function run() {
  console.log('--- MIGRATING PRODUCTS TO CLOUDINARY ---');
  const products = await prisma.product.findMany();
  for (const p of products) {
    let changed = false;
    let newImage = p.image;
    let newImage2 = p.image2;
    let newImages = [...(p.images || [])];

    if (p.image && p.image.includes('ibb.co')) {
      newImage = await uploadUrlToCloudinary(p.image);
      changed = true;
    }
    if (p.image2 && p.image2.includes('ibb.co')) {
      newImage2 = await uploadUrlToCloudinary(p.image2);
      changed = true;
    }
    if (p.images && p.images.some(img => img.includes('ibb.co'))) {
      const updatedList: string[] = [];
      for (const img of p.images) {
        if (img.includes('ibb.co')) {
          const cUrl = await uploadUrlToCloudinary(img);
          updatedList.push(cUrl);
        } else {
          updatedList.push(img);
        }
      }
      newImages = updatedList;
      changed = true;
    }

    if (changed) {
      await prisma.product.update({
        where: { id: p.id },
        data: {
          image: newImage,
          image2: newImage2,
          images: newImages
        }
      });
      console.log(`Updated Product [${p.name}] with Cloudinary URLs.`);
    }
  }

  console.log('--- MIGRATING CATEGORIES TO CLOUDINARY ---');
  const categories = await prisma.category.findMany();
  for (const c of categories) {
    if (c.image && c.image.includes('ibb.co')) {
      const newImg = await uploadUrlToCloudinary(c.image, 'onwear/categories');
      await prisma.category.update({
        where: { id: c.id },
        data: { image: newImg }
      });
      console.log(`Updated Category [${c.name}] with Cloudinary URL.`);
    }
  }

  console.log('--- MIGRATING PROMOTIONS / SLIDES TO CLOUDINARY ---');
  const promotions = await prisma.promotion.findMany();
  for (const pr of promotions) {
    if (pr.imageUrl && pr.imageUrl.includes('ibb.co')) {
      const newImg = await uploadUrlToCloudinary(pr.imageUrl, 'onwear/promotions');
      await prisma.promotion.update({
        where: { id: pr.id },
        data: { imageUrl: newImg }
      });
      console.log(`Updated Promotion [${pr.title}] with Cloudinary URL.`);
    }
  }

  console.log('--- MIGRATING STORE SETTINGS TO CLOUDINARY ---');
  const settings = await prisma.storeSetting.findMany();
  for (const s of settings) {
    const updateData: any = {};
    if (s.loginImageUrl && s.loginImageUrl.includes('ibb.co')) {
      updateData.loginImageUrl = await uploadUrlToCloudinary(s.loginImageUrl, 'onwear/settings');
    }
    if (s.registerImageUrl && s.registerImageUrl.includes('ibb.co')) {
      updateData.registerImageUrl = await uploadUrlToCloudinary(s.registerImageUrl, 'onwear/settings');
    }
    if (s.lookbookImageUrl && s.lookbookImageUrl.includes('ibb.co')) {
      updateData.lookbookImageUrl = await uploadUrlToCloudinary(s.lookbookImageUrl, 'onwear/settings');
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.storeSetting.update({
        where: { id: s.id },
        data: updateData
      });
      console.log(`Updated Store Settings with Cloudinary URLs.`);
    }
  }

  console.log('=== CLOUDINARY MIGRATION COMPLETE ===');
}

run()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
