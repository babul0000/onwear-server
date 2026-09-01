import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateToken } from '../../utils/jwt';
import { AppError } from '../../middlewares/error.middleware';
import { registerSchema, loginSchema } from '../../utils/validation';
import { AccountStatus, CreatedFrom } from '@prisma/client';
import { EmailService } from '../email/email.service';

export class AuthService {
  static async register(data: any) {
    const parsed = registerSchema.parse(data);
    const normalizedEmail = parsed.email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
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
          email: normalizedEmail,
          password: hashedPasswordVal,
          phone: parsed.phone,
          address: parsed.address,
          accountStatus: AccountStatus.ACTIVE,
          createdFrom: CreatedFrom.DIRECT_REGISTRATION,
          emailVerified: true
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
    const normalizedEmail = parsed.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user || user.isDeleted) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Check if account has not been activated / password not set yet
    if (!user.password || user.accountStatus === AccountStatus.PENDING_ACTIVATION) {
      throw new AppError(
        'Your account was created via guest checkout and is pending activation. Please check your email to set your password or request a new activation link.',
        403,
        'ACCOUNT_PENDING_ACTIVATION'
      );
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

  /**
   * Verify an activation token on page load
   */
  static async verifyActivationToken(rawToken: string) {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new AppError('Activation token is required', 400, 'BAD_REQUEST');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const activationToken = await prisma.activationToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!activationToken) {
      throw new AppError('This activation link is invalid.', 400, 'INVALID_TOKEN');
    }

    if (activationToken.usedAt) {
      throw new AppError('This activation link has already been used.', 400, 'TOKEN_ALREADY_USED');
    }

    if (activationToken.expiresAt < new Date()) {
      throw new AppError('This activation link has expired.', 400, 'TOKEN_EXPIRED');
    }

    return {
      valid: true,
      email: activationToken.user.email,
      name: activationToken.user.name
    };
  }

  /**
   * Set user's password and activate account
   */
  static async setPasswordAndActivate(rawToken: string, password: string) {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new AppError('Activation token is required', 400, 'BAD_REQUEST');
    }

    if (!password || password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400, 'BAD_REQUEST');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const activationToken = await prisma.activationToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!activationToken) {
      throw new AppError('This activation link is invalid.', 400, 'INVALID_TOKEN');
    }

    if (activationToken.usedAt) {
      throw new AppError('This activation link has already been used.', 400, 'TOKEN_ALREADY_USED');
    }

    if (activationToken.expiresAt < new Date()) {
      throw new AppError('This activation link has expired.', 400, 'TOKEN_EXPIRED');
    }

    const hashedPasswordVal = await hashPassword(password);

    // Update user and invalidate token atomically
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: activationToken.userId },
        data: {
          password: hashedPasswordVal,
          accountStatus: AccountStatus.ACTIVE,
          emailVerified: true
        }
      });

      await tx.activationToken.update({
        where: { id: activationToken.id },
        data: { usedAt: new Date() }
      });

      return user;
    });

    // Auto-login: generate JWT token
    const token = generateToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role
    });

    const { password: _password, ...safeUser } = updatedUser;
    return { user: safeUser, token };
  }

  /**
   * Resend activation email
   */
  static async resendActivationEmail(email: string) {
    if (!email || !email.includes('@')) {
      throw new AppError('A valid email address is required', 400, 'BAD_REQUEST');
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (user && (!user.password || user.accountStatus === AccountStatus.PENDING_ACTIVATION || !user.emailVerified)) {
      // Invalidate previous unused tokens for this user
      await prisma.activationToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() }
      });

      // Create new token (24h expiry)
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await prisma.activationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt
        }
      });

      // Safe Async Email
      EmailService.sendAccountActivationEmail({
        to: user.email,
        name: user.name,
        token: rawToken
      }).catch((err) => console.error('[AuthService] Resend activation error:', err));
    }

    // Generic response to prevent account enumeration
    return {
      message: 'If an account exists for this email and requires activation, an email has been sent.'
    };
  }
}
