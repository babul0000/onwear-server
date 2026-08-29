import { prisma } from '../../lib/prisma';
import { AppError } from '../../middlewares/error.middleware';
import { ShippingZone } from '@prisma/client';

export class AddressService {
  static async getAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  static async getAddressById(addressId: string, userId: string) {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId }
    });

    if (!address) {
      throw new AppError('Address not found', 404, 'NOT_FOUND');
    }

    return address;
  }

  static async createAddress(userId: string, data: {
    label: string;
    name: string;
    phone: string;
    line: string;
    zone: ShippingZone;
    isDefault?: boolean;
  }) {
    return prisma.$transaction(async (tx) => {
      const existingCount = await tx.address.count({ where: { userId } });
      const shouldBeDefault = existingCount === 0 || data.isDefault === true;

      if (shouldBeDefault) {
        // Set all other addresses for this user to isDefault = false
        await tx.address.updateMany({
          where: { userId },
          data: { isDefault: false }
        });
      }

      return tx.address.create({
        data: {
          userId,
          label: data.label.trim(),
          name: data.name.trim(),
          phone: data.phone.trim(),
          line: data.line.trim(),
          zone: data.zone,
          isDefault: shouldBeDefault
        }
      });
    });
  }

  static async updateAddress(addressId: string, userId: string, data: {
    label?: string;
    name?: string;
    phone?: string;
    line?: string;
    zone?: ShippingZone;
    isDefault?: boolean;
  }) {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId }
    });

    if (!address) {
      throw new AppError('Address not found', 404, 'NOT_FOUND');
    }

    return prisma.$transaction(async (tx) => {
      if (data.isDefault === true) {
        // Mark all others as non-default
        await tx.address.updateMany({
          where: { userId, id: { not: addressId } },
          data: { isDefault: false }
        });
      }

      return tx.address.update({
        where: { id: addressId },
        data: {
          ...(data.label !== undefined && { label: data.label.trim() }),
          ...(data.name !== undefined && { name: data.name.trim() }),
          ...(data.phone !== undefined && { phone: data.phone.trim() }),
          ...(data.line !== undefined && { line: data.line.trim() }),
          ...(data.zone !== undefined && { zone: data.zone }),
          ...(data.isDefault !== undefined && { isDefault: data.isDefault })
        }
      });
    });
  }

  static async deleteAddress(addressId: string, userId: string) {
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId }
    });

    if (!address) {
      throw new AppError('Address not found', 404, 'NOT_FOUND');
    }

    return prisma.$transaction(async (tx) => {
      await tx.address.delete({
        where: { id: addressId }
      });

      // If the deleted address was default, promote the most recent remaining address to default
      if (address.isDefault) {
        const remaining = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' }
        });

        if (remaining) {
          await tx.address.update({
            where: { id: remaining.id },
            data: { isDefault: true }
          });
        }
      }

      return { success: true };
    });
  }
}
