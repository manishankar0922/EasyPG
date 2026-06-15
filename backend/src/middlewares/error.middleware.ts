import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Always log full error in backend using structured logger
  logger.error('API Error Caught', {
    route: `${req.method} ${req.originalUrl}`,
    errorMessage: err.message,
    errorCode: err.code || err.name,
    stack: err.stack,
    meta: err.meta
  });

  // Prisma specific errors
  if (err.code === 'P2002') {
    return res.status(400).json({
      success: false,
      error: 'Unique constraint validation failed. Record already exists.',
      code: 'ALREADY_EXISTS',
      details: [{
        field: err.meta?.target?.[0] || 'unknown',
        message: 'Value must be unique'
      }]
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'The requested record could not be found.',
      code: 'NOT_FOUND'
    });
  }
  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      error: 'Foreign key constraint failed. Related record not found.',
      code: 'FOREIGN_KEY_FAILED',
      details: [{
        field: err.meta?.field_name || 'unknown',
        message: 'Reference constraint failed'
      }]
    });
  }

  // Auth errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token. Please sign in again.',
      code: 'INVALID_TOKEN'
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Your authentication session has expired. Please sign in again.',
      code: 'TOKEN_EXPIRED'
    });
  }

  // Validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_FAILED',
      details: err.errors.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // Show real error in development, mask in production
  const isDev = process.env.NODE_ENV === 'development';

  return res.status(err.statusCode || 500).json({
    success: false,
    error: isDev ? err.message : 'An internal server error occurred.',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    ...(isDev && { stack: err.stack })
  });
};
