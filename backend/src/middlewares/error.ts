import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { AppError } from '../utils/errors';

export interface RequestWithUser extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  error: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error(error);

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
    });
  }

  // User-facing message for unhandled errors
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
  });
};

/**
 * 404 Not Found middleware
 */
export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    code: 'NOT_FOUND',
  });
};
