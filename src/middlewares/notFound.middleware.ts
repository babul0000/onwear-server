import { Request, Response, NextFunction } from 'express';

export const notFoundMiddleware = (req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: `API Route Not Found - ${req.originalUrl}`,
    error: {
      code: 'NOT_FOUND'
    }
  });
};
