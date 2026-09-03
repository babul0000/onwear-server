import { prisma } from '../../lib/prisma';
import { cache } from '../../utils/cache';

const CACHE_KEY = 'settings:store:default';

export class SettingService {
  static async getSettings() {
    const cached = await cache.get<any>(CACHE_KEY);
    if (cached) return cached;

    let settings = await prisma.storeSetting.findUnique({
      where: { id: 'default' }
    });

    if (!settings) {
      // Create default settings if not exists
      settings = await prisma.storeSetting.create({
        data: {
          id: 'default',
          storeName: 'ONWEAR',
          tagline: 'Unique way of elegance.',
          logoUrl: null,
          phone: '01603-742963',
          email: 'onwear.25@gmail.com',
          address: 'Khilkhet, Dhaka, Bangladesh, 1229',
          facebookUrl: 'https://facebook.com/onwear.bd',
          instagramUrl: 'https://instagram.com/onwear_bd',
          bkashNumber: '01603742963',
          nagadNumber: '01603742963',
          whatsappNumber: '8801603742963',
          shippingInsideDhaka: 80,
          shippingOutsideDhaka: 150
        }
      });
    }

    await cache.set(CACHE_KEY, settings, 7200); // 2 hours TTL
    return settings;
  }

  static async updateSettings(data: {
    storeName?: string;
    tagline?: string;
    logoUrl?: string | null;
    phone?: string;
    email?: string;
    address?: string;
    facebookUrl?: string;
    instagramUrl?: string;
    bkashNumber?: string;
    nagadNumber?: string;
    whatsappNumber?: string;
    shippingInsideDhaka?: number;
    shippingOutsideDhaka?: number;
  }) {
    // Ensure default settings exist first
    await this.getSettings();

    // Clean up/format fields if necessary
    const updateData: any = {};
    if (data.storeName !== undefined) updateData.storeName = data.storeName;
    if (data.tagline !== undefined) updateData.tagline = data.tagline;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.facebookUrl !== undefined) updateData.facebookUrl = data.facebookUrl;
    if (data.instagramUrl !== undefined) updateData.instagramUrl = data.instagramUrl;
    if (data.bkashNumber !== undefined) updateData.bkashNumber = data.bkashNumber;
    if (data.nagadNumber !== undefined) updateData.nagadNumber = data.nagadNumber;
    if (data.whatsappNumber !== undefined) updateData.whatsappNumber = data.whatsappNumber;
    if (data.shippingInsideDhaka !== undefined) updateData.shippingInsideDhaka = Number(data.shippingInsideDhaka);
    if (data.shippingOutsideDhaka !== undefined) updateData.shippingOutsideDhaka = Number(data.shippingOutsideDhaka);

    const updated = await prisma.storeSetting.update({
      where: { id: 'default' },
      data: updateData
    });

    await cache.del(CACHE_KEY);
    return updated;
  }
}
