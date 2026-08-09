import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { createProductSchema, updateProductSchema } from '../../utils/validation';
import { getPaginationParams } from '../../utils/pagination';

export class ProductService {
  static async create(data: any) {
    const parsed = createProductSchema.parse(data);

    // Validate Category
    const category = await prisma.category.findFirst({
      where: { id: parsed.categoryId, isDeleted: false }
    });
    if (!category) {
      throw new AppError('Category not found or deleted', 404, 'NOT_FOUND');
    }

    // Check unique slug and sku
    const existingSlug = await prisma.product.findUnique({
      where: { slug: parsed.slug }
    });
    if (existingSlug) {
      throw new AppError('Product slug already exists', 409, 'DUPLICATE_RECORD');
    }

    const existingSku = await prisma.product.findUnique({
      where: { sku: parsed.sku }
    });
    if (existingSku) {
      throw new AppError('Product SKU already exists', 409, 'DUPLICATE_RECORD');
    }

    return prisma.product.create({
      data: parsed
    });
  }

  static async getById(id: string) {
    const product = await prisma.product.findFirst({
      where: { id, isDeleted: false },
      include: {
        category: {
          select: { id: true, name: true, slug: true }
        }
      }
    });
    if (!product) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }
    return product;
  }

  static async getAll(query: any, includeDeleted: boolean = false) {
    const { page, limit, skip } = getPaginationParams(query);

    const where: any = {
      isDeleted: includeDeleted ? undefined : false
    };

    // Search query: name or description
    if (query.search) {
      const searchStr = query.search as string;
      where.OR = [
        { name: { contains: searchStr, mode: 'insensitive' } },
        { description: { contains: searchStr, mode: 'insensitive' } }
      ];
    }

    // Category filter: could be category slug or categoryId
    if (query.category) {
      where.category = {
        OR: [
          { id: query.category as string },
          { slug: query.category as string }
        ]
      };
    }

    // Price range filters
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined && query.minPrice !== '') {
        where.price.gte = parseFloat(query.minPrice as string);
      }
      if (query.maxPrice !== undefined && query.maxPrice !== '') {
        where.price.lte = parseFloat(query.maxPrice as string);
      }
    }

    // Status filter
    if (query.status) {
      where.status = query.status;
    }

    // Sorting
    const sortBy = query.sortBy ? (query.sortBy as string) : 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [total, data] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: {
            select: { id: true, name: true, slug: true }
          }
        }
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  static async update(id: string, data: any) {
    const parsed = updateProductSchema.parse(data);

    const product = await prisma.product.findFirst({
      where: { id, isDeleted: false }
    });
    if (!product) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    if (parsed.slug && parsed.slug !== product.slug) {
      const existing = await prisma.product.findUnique({
        where: { slug: parsed.slug }
      });
      if (existing) {
        throw new AppError('Product slug already exists', 409, 'DUPLICATE_RECORD');
      }
    }

    if (parsed.sku && parsed.sku !== product.sku) {
      const existing = await prisma.product.findUnique({
        where: { sku: parsed.sku }
      });
      if (existing) {
        throw new AppError('Product SKU already exists', 409, 'DUPLICATE_RECORD');
      }
    }

    if (parsed.categoryId && parsed.categoryId !== product.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: parsed.categoryId, isDeleted: false }
      });
      if (!category) {
        throw new AppError('Category not found or deleted', 404, 'NOT_FOUND');
      }
    }

    return prisma.product.update({
      where: { id },
      data: parsed
    });
  }

  static async softDelete(id: string) {
    const product = await prisma.product.findFirst({
      where: { id, isDeleted: false }
    });
    if (!product) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    return prisma.product.update({
      where: { id },
      data: { isDeleted: true }
    });
  }
}
