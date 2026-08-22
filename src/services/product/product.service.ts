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
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 12;
    const skip = (page - 1) * limit;

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

    // Category filter: could be category slug or categoryId.
    // If it is a parent category, we should include all its subcategories' products.
    if (query.category) {
      const categoryRecord = await prisma.category.findFirst({
        where: {
          OR: [
            { id: query.category as string },
            { slug: query.category as string }
          ],
          isDeleted: false
        },
        include: { subcategories: { select: { id: true } } }
      });

      if (categoryRecord) {
        const categoryIds = [categoryRecord.id, ...categoryRecord.subcategories.map((s) => s.id)];
        where.categoryId = { in: categoryIds };
      } else {
        where.categoryId = 'non-existent-id';
      }
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

    // Fetch all matching products before in-memory filtering for stats mapping
    const dbProducts = await prisma.product.findMany({
      where,
      orderBy,
      include: {
        category: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    // Helper: Parse description metadata
    const parseMetadata = (desc: string | null) => {
      if (!desc) return { sizes: [], colors: [], tags: [] };
      const lines = desc.split('\n');
      let sizes: string[] = [];
      let colors: string[] = [];
      let tags: string[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('Sizes:')) {
          sizes = trimmed.replace('Sizes:', '').split(',').map(s => s.trim().toUpperCase());
        }
        if (trimmed.startsWith('Colors:')) {
          colors = trimmed.replace('Colors:', '').split(',').map(c => c.trim().toLowerCase());
        }
        if (trimmed.startsWith('Tags:')) {
          tags = trimmed.replace('Tags:', '').split(',').map(t => t.trim().toLowerCase());
        }
      }
      return { sizes, colors, tags };
    };

    // 1. Gather distinct sizes, colors, and prices
    const allSizesSet = new Set<string>();
    const allColorsSet = new Set<string>();
    let minCategoryPrice = Infinity;
    let maxCategoryPrice = -Infinity;

    dbProducts.forEach(p => {
      const { sizes, colors } = parseMetadata(p.description);
      sizes.forEach(s => { if (s) allSizesSet.add(s); });
      colors.forEach(c => { if (c) allColorsSet.add(c); });

      const price = p.discountPrice !== null ? p.discountPrice : p.price;
      if (price < minCategoryPrice) minCategoryPrice = price;
      if (price > maxCategoryPrice) maxCategoryPrice = price;
    });

    const availableSizes = Array.from(allSizesSet).sort();
    const availableColors = Array.from(allColorsSet).sort();

    // 2. Perform in-memory filter matching
    let filteredProducts = dbProducts;
    if (query.sizes) {
      const selectedSizes = (query.sizes as string).split(',').map(s => s.trim().toUpperCase());
      filteredProducts = filteredProducts.filter(p => {
        const { sizes } = parseMetadata(p.description);
        return selectedSizes.some(s => sizes.includes(s));
      });
    }

    if (query.colors) {
      const selectedColors = (query.colors as string).split(',').map(c => c.trim().toLowerCase());
      filteredProducts = filteredProducts.filter(p => {
        const { colors } = parseMetadata(p.description);
        const nameMatches = selectedColors.some(c => p.name.toLowerCase().includes(c));
        return nameMatches || selectedColors.some(c => colors.includes(c));
      });
    }

    const total = filteredProducts.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedProducts = filteredProducts.slice(skip, skip + limit);

    return {
      data: paginatedProducts,
      meta: {
        page,
        limit,
        total,
        totalPages,
        filters: {
          sizes: availableSizes,
          colors: availableColors,
          priceRange: {
            min: minCategoryPrice === Infinity ? 0 : minCategoryPrice,
            max: maxCategoryPrice === -Infinity ? 0 : maxCategoryPrice
          }
        }
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
