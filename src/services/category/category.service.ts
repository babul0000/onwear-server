import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { createCategorySchema, updateCategorySchema } from '../../utils/validation';

export class CategoryService {
  static async create(data: any) {
    const parsed = createCategorySchema.parse(data);

    const existing = await prisma.category.findUnique({
      where: { slug: parsed.slug }
    });
    if (existing) {
      throw new AppError('Category slug already exists', 409, 'DUPLICATE_RECORD');
    }

    return prisma.category.create({
      data: parsed
    });
  }

  static async getAll(includeInactive: boolean = false) {
    return prisma.category.findMany({
      where: {
        parentId: null,
        isDeleted: false,
        ...(!includeInactive && { status: 'ACTIVE' })
      },
      include: {
        subcategories: {
          where: {
            isDeleted: false,
            ...(!includeInactive && { status: 'ACTIVE' })
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  static async getById(id: string) {
    const category = await prisma.category.findFirst({
      where: { id, isDeleted: false }
    });
    if (!category) {
      throw new AppError('Category not found', 404, 'NOT_FOUND');
    }
    return category;
  }

  static async update(id: string, data: any) {
    const parsed = updateCategorySchema.parse(data);

    const category = await prisma.category.findFirst({
      where: { id, isDeleted: false }
    });
    if (!category) {
      throw new AppError('Category not found', 404, 'NOT_FOUND');
    }

    if (parsed.slug && parsed.slug !== category.slug) {
      const existing = await prisma.category.findUnique({
        where: { slug: parsed.slug }
      });
      if (existing) {
        throw new AppError('Category slug already exists', 409, 'DUPLICATE_RECORD');
      }
    }

    return prisma.category.update({
      where: { id },
      data: parsed
    });
  }

  static async softDelete(id: string) {
    const category = await prisma.category.findFirst({
      where: { id, isDeleted: false }
    });
    if (!category) {
      throw new AppError('Category not found', 404, 'NOT_FOUND');
    }

    return prisma.$transaction(async (tx) => {
      // Soft delete associated products
      await tx.product.updateMany({
        where: { categoryId: id },
        data: { isDeleted: true }
      });

      return tx.category.update({
        where: { id },
        data: { isDeleted: true }
      });
    });
  }
}
