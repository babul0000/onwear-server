import { uploadBufferToCloudinary, isCloudinaryConfigured } from '../src/config/cloudinary';

async function test() {
  console.log('Is Cloudinary configured:', isCloudinaryConfigured());
  // 1x1 transparent PNG buffer
  const sampleBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );

  console.log('Uploading sample test buffer to Cloudinary...');
  const result = await uploadBufferToCloudinary(sampleBuffer, 'onwear/test');
  console.log('Upload Result:', result);
}

test().catch(console.error);
