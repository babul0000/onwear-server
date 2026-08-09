import { prisma } from '../../lib/prisma';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateToken } from '../../utils/jwt';
import { AppError } from '../../middlewares/error.middleware';
import { registerSchema, loginSchema } from '../../utils/validation';

export class AuthService {
  static async register(data: any) {
    const parsed = registerSchema.parse(data);

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.email }
    });

    if (existingUser) {
      throw new AppError(
        'Email address already registered',
        409,
        'DUPLICATE_RECORD'
      );
    }

    const hashedPasswordVal = await hashPassword(parsed.password);

    // Create user, active cart, and wishlist in transaction
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: parsed.name,
          email: parsed.email,
          password: hashedPasswordVal,
          phone: parsed.phone,
          address: parsed.address
        }
      });

      await tx.cart.create({
        data: { userId: createdUser.id }
      });

      await tx.wishlist.create({
        data: { userId: createdUser.id }
      });

      return createdUser;
    });

    // Remove password
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  static async login(data: any) {
    const parsed = loginSchema.parse(data);

    const user = await prisma.user.findUnique({
      where: { email: parsed.email }
    });

    if (!user || user.isDeleted) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await comparePassword(parsed.password, user.password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const { password: _password, ...safeUser } = user;
    return { user: safeUser, token };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.isDeleted) {
      throw new AppError('User not found or deleted', 404, 'NOT_FOUND');
    }

    const { password: _password, ...safeUser } = user;
    return safeUser;
  }
}
