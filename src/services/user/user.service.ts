import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';

export class UserService {
  static async getAll() {
    return prisma.user.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getById(id: string, requesterId: string, requesterRole: string) {
    if (requesterRole !== 'ADMIN' && requesterId !== id) {
      throw new AppError('Forbidden: Access is denied', 403, 'FORBIDDEN');
    }

    const user = await prisma.user.findFirst({
      where: { id, isDeleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return user;
  }

  static async update(id: string, requesterId: string, requesterRole: string, data: any) {
    if (requesterRole !== 'ADMIN' && requesterId !== id) {
      throw new AppError('Forbidden: Access is denied', 403, 'FORBIDDEN');
    }

    const user = await prisma.user.findFirst({
      where: { id, isDeleted: false }
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    const updateData: any = {
      name: data.name,
      phone: data.phone,
      address: data.address
    };

    if (requesterRole === 'ADMIN' && data.role) {
      updateData.role = data.role;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return updatedUser;
  }

  static async softDelete(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, isDeleted: false }
    });

    if (!user) {
      throw new AppError('User not found', 404, 'NOT_FOUND');
    }

    return prisma.user.update({
      where: { id },
      data: { isDeleted: true }
    });
  }
}
