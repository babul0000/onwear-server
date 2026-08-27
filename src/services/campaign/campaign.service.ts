import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';

export class CampaignService {
  static async create(data: {
    name: string;
    slug: string;
    description?: string;
    startDate: string;
    endDate: string;
    isActive?: boolean;
  }) {
    if (!data.name || !data.slug || !data.startDate || !data.endDate) {
      throw new AppError('Name, slug, startDate, and endDate are required', 400, 'BAD_REQUEST');
    }

    const cleanSlug = data.slug.trim().toLowerCase();
    const existing = await prisma.campaign.findUnique({
      where: { slug: cleanSlug }
    });

    if (existing) {
      throw new AppError('Campaign slug already exists', 409, 'DUPLICATE_RECORD');
    }

    return prisma.campaign.create({
      data: {
        name: data.name.trim(),
        slug: cleanSlug,
        description: data.description || null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        isActive: data.isActive !== undefined ? !!data.isActive : true
      }
    });
  }

  static async getAll() {
    return prisma.campaign.findMany({
      orderBy: { startDate: 'desc' }
    });
  }

  static async update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
    }
  ) {
    const campaign = await prisma.campaign.findUnique({
      where: { id }
    });

    if (!campaign) {
      throw new AppError('Campaign not found', 404, 'NOT_FOUND');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.isActive !== undefined) updateData.isActive = !!data.isActive;

    if (data.slug !== undefined) {
      const cleanSlug = data.slug.trim().toLowerCase();
      if (cleanSlug !== campaign.slug) {
        const existing = await prisma.campaign.findUnique({
          where: { slug: cleanSlug }
        });
        if (existing) {
          throw new AppError('Campaign slug already exists', 409, 'DUPLICATE_RECORD');
        }
        updateData.slug = cleanSlug;
      }
    }

    return prisma.campaign.update({
      where: { id },
      data: updateData
    });
  }

  static async delete(id: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id }
    });

    if (!campaign) {
      throw new AppError('Campaign not found', 404, 'NOT_FOUND');
    }

    return prisma.campaign.delete({
      where: { id }
    });
  }
}
