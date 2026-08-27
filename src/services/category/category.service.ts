import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { createCategorySchema, updateCategorySchema } from '../../utils/validation';
import { cache } from '../../utils/cache';

export class CategoryService {
  static async create(data: any) {
    const parsed = createCategorySchema.parse(data);

    const existing = await prisma.category.findUnique({
      where: { slug: parsed.slug }
    });
    if (existing) {
      throw new AppError('Category slug already exists', 409, 'DUPLICATE_RECORD');
    }

    const category = await prisma.category.create({
      data: parsed
    });
    await cache.clearPattern('categories:*');
    return category;
  }

  static async getAll(includeInactive: boolean = false) {
    const cacheKey = `categories:all:${includeInactive}`;
    const cached = await cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const categories = await prisma.category.findMany({
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

    await cache.set(cacheKey, categories, 3600);
    return categories;
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

    const categoryResult = await prisma.category.update({
      where: { id },
      data: parsed
    });
    await cache.clearPattern('categories:*');
    return categoryResult;
  }

  static async softDelete(id: string) {
    const category = await prisma.category.findFirst({
      where: { id, isDeleted: false }
    });
    if (!category) {
      throw new AppError('Category not found', 404, 'NOT_FOUND');
    }

    const result = await prisma.$transaction(async (tx) => {
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

    await cache.clearPattern('categories:*');
    await cache.clearPattern('products:*');
    return result;
  }
}
