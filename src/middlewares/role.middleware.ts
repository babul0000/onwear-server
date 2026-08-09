import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { AppError } from './error.middleware';
import { Role } from '@prisma/client';

export const roleMiddleware = (...allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(
        new AppError('Unauthorized: Authentication required', 401, 'UNAUTHORIZED')
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError('Forbidden: Access is denied', 403, 'FORBIDDEN')
      );
    }

    next();
  };
};
