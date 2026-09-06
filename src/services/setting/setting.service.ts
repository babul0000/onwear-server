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
          shippingOutsideDhaka: 150,
          freeShippingMinAmount: 2500,
          announcementText: '🎉 Free Shipping on all orders above Tk 2,500! Use coupon ONWEAR10',
          announcementEnabled: true,
          announcementLink: '/products',
          lookbookTitle: 'THE SIGNATURE COLLECTION',
          lookbookSubtitle: 'THE DENIM OVERCOAT LOOK',
          lookbookDescription: 'Combine our signature Indigo Denim Overshirt with tailormade stretch pants for a modern casual lookup that fits both office work and weekend outings.',
          lookbookImageUrl: 'https://i.ibb.co/FqHjfvxG/Gemini-Generated-Image-ino58qino58qino5.jpg',
          lookbookLinkUrl: '/products?category=denim',
          loginImageUrl: 'https://i.ibb.co/HTB1fbYf/On-Wear-unique-way-of-elegance-1-jpg-2.jpg',
          loginTitle: 'ELEVATE STYLE',
          loginSubtitle: 'Find your signature clothing comfort at ONWEAR',
          registerImageUrl: 'https://i.ibb.co/FqHjfvxG/Gemini-Generated-Image-ino58qino58qino5.jpg',
          registerTitle: 'START JOURNEY',
          registerSubtitle: 'Join ONWEAR to unlock VIP privileges, track orders & save wishlists'
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
    freeShippingMinAmount?: number;
    announcementText?: string | null;
    announcementEnabled?: boolean;
    announcementLink?: string | null;
    lookbookTitle?: string | null;
    lookbookSubtitle?: string | null;
    lookbookDescription?: string | null;
    lookbookImageUrl?: string | null;
    lookbookLinkUrl?: string | null;
    loginImageUrl?: string | null;
    loginTitle?: string | null;
    loginSubtitle?: string | null;
    registerImageUrl?: string | null;
    registerTitle?: string | null;
    registerSubtitle?: string | null;
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
    if (data.freeShippingMinAmount !== undefined) updateData.freeShippingMinAmount = Number(data.freeShippingMinAmount);
    if (data.announcementText !== undefined) updateData.announcementText = data.announcementText;
    if (data.announcementEnabled !== undefined) updateData.announcementEnabled = !!data.announcementEnabled;
    if (data.announcementLink !== undefined) updateData.announcementLink = data.announcementLink;
    if (data.lookbookTitle !== undefined) updateData.lookbookTitle = data.lookbookTitle;
    if (data.lookbookSubtitle !== undefined) updateData.lookbookSubtitle = data.lookbookSubtitle;
    if (data.lookbookDescription !== undefined) updateData.lookbookDescription = data.lookbookDescription;
    if (data.lookbookImageUrl !== undefined) updateData.lookbookImageUrl = data.lookbookImageUrl;
    if (data.lookbookLinkUrl !== undefined) updateData.lookbookLinkUrl = data.lookbookLinkUrl;
    if (data.loginImageUrl !== undefined) updateData.loginImageUrl = data.loginImageUrl;
    if (data.loginTitle !== undefined) updateData.loginTitle = data.loginTitle;
    if (data.loginSubtitle !== undefined) updateData.loginSubtitle = data.loginSubtitle;
    if (data.registerImageUrl !== undefined) updateData.registerImageUrl = data.registerImageUrl;
    if (data.registerTitle !== undefined) updateData.registerTitle = data.registerTitle;
    if (data.registerSubtitle !== undefined) updateData.registerSubtitle = data.registerSubtitle;

    const updated = await prisma.storeSetting.update({
      where: { id: 'default' },
      data: updateData
    });

    await cache.del(CACHE_KEY);
    return updated;
  }
}

