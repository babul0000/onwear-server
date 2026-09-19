import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { hashPassword, comparePassword } from '../../utils/password';
import { generateToken } from '../../utils/jwt';
import { AppError } from '../../middlewares/error.middleware';
import { registerSchema, loginSchema } from '../../utils/validation';
import { AccountStatus, CreatedFrom } from '@prisma/client';
import { EmailService } from '../email/email.service';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

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

  /**
   * Google OAuth: Handle Google Login and Registration
   */
  static async googleAuth(data: { idToken?: string; credential?: string; accessToken?: string }) {
    const rawIdToken = data.idToken || data.credential;
    const accessToken = data.accessToken;

    if (!rawIdToken && !accessToken) {
      throw new AppError('Google authentication token or credential is required', 400, 'BAD_REQUEST');
    }

    let googleUser: {
      sub: string;
      email: string;
      name: string;
      picture?: string;
      email_verified?: boolean;
    } | null = null;

    // 1. Try verifying idToken if provided
    if (rawIdToken) {
      try {
        if (env.GOOGLE_CLIENT_ID) {
          const ticket = await googleClient.verifyIdToken({
            idToken: rawIdToken,
            audience: env.GOOGLE_CLIENT_ID,
          });
          const payload = ticket.getPayload();
          if (payload && payload.email) {
            googleUser = {
              sub: payload.sub,
              email: payload.email,
              name: payload.name || payload.email.split('@')[0],
              picture: payload.picture,
              email_verified: payload.email_verified,
            };
          }
        } else {
          // If GOOGLE_CLIENT_ID is not configured locally, verify via Google's tokeninfo API
          const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(rawIdToken)}`);
          if (res.ok) {
            const tokenInfo: any = await res.json();
            if (tokenInfo.email) {
              googleUser = {
                sub: tokenInfo.sub,
                email: tokenInfo.email,
                name: tokenInfo.name || tokenInfo.email.split('@')[0],
                picture: tokenInfo.picture,
                email_verified: tokenInfo.email_verified === 'true' || tokenInfo.email_verified === true,
              };
            }
          }
        }
      } catch (err: any) {
        console.warn('[AuthService] verifyIdToken failed, attempting fallback...', err?.message);
      }
    }

    // 2. Fallback: query Google userinfo API with accessToken
    if (!googleUser && accessToken) {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (res.ok) {
          const userInfo: any = await res.json();
          if (userInfo.email) {
            googleUser = {
              sub: userInfo.sub,
              email: userInfo.email,
              name: userInfo.name || userInfo.email.split('@')[0],
              picture: userInfo.picture,
              email_verified: userInfo.email_verified === true || userInfo.email_verified === 'true',
            };
          }
        }
      } catch (err: any) {
        console.error('[AuthService] Google userinfo fetch error:', err?.message);
      }
    }

    if (!googleUser || !googleUser.email) {
      throw new AppError('Invalid or expired Google authentication credentials', 401, 'INVALID_GOOGLE_TOKEN');
    }

    const normalizedEmail = googleUser.email.toLowerCase().trim();

    // Find existing user by email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    let authenticatedUser: any;

    if (existingUser) {
      if (existingUser.isDeleted) {
        throw new AppError('This account has been deactivated. Please contact support.', 403, 'ACCOUNT_DEACTIVATED');
      }

      if (existingUser.accountStatus === AccountStatus.SUSPENDED) {
        throw new AppError('Your account has been suspended.', 403, 'ACCOUNT_SUSPENDED');
      }

      // If user had pending activation or unverified email, activate now since Google verified it
      authenticatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          accountStatus: AccountStatus.ACTIVE,
          emailVerified: true,
          googleId: existingUser.googleId || googleUser.sub,
          avatar: existingUser.avatar || googleUser.picture,
        },
      });

      // Ensure user has Cart and Wishlist
      await prisma.cart.upsert({
        where: { userId: existingUser.id },
        update: {},
        create: { userId: existingUser.id },
      });

      await prisma.wishlist.upsert({
        where: { userId: existingUser.id },
        update: {},
        create: { userId: existingUser.id },
      });
    } else {
      // Register new user via Google
      authenticatedUser = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            name: googleUser.name,
            email: normalizedEmail,
            avatar: googleUser.picture,
            googleId: googleUser.sub,
            accountStatus: AccountStatus.ACTIVE,
            createdFrom: CreatedFrom.GOOGLE,
            emailVerified: true,
            password: null,
          },
        });

        await tx.cart.create({
          data: { userId: newUser.id },
        });

        await tx.wishlist.create({
          data: { userId: newUser.id },
        });

        return newUser;
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: authenticatedUser.id,
      email: authenticatedUser.email,
      role: authenticatedUser.role,
    });

    const { password: _password, ...safeUser } = authenticatedUser;
    return { user: safeUser, token };
  }
}
