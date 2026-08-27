import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export class AppError extends Error {
  public statusCode: number;
  public errorCode?: string;

  constructor(message: string, statusCode: number, errorCode?: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorMiddleware = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  let details: any = undefined;

  // Handle Zod Validation Errors
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
    details = err.errors.map((e: any) => ({
      field: e.path.join('.'),
      message: e.message
    }));
  }

  // Handle Prisma Known Request Errors
  else if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    if (err.code === 'P2002') {
      statusCode = 409;
      message = `Unique constraint failed on field: ${err.meta?.target || 'unknown'}`;
      errorCode = 'DUPLICATE_RECORD';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = err.meta?.cause || 'Record not found';
      errorCode = 'NOT_FOUND';
    } else {
      statusCode = 400;
      message = 'Database operation failed';
      errorCode = `PRISMA_ERROR_${err.code}`;
    }
  }

  // Log the error using winston structured logger
  logger.error(message, {
    statusCode,
    errorCode,
    details,
    stack: err.stack
  });

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: errorCode,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};
