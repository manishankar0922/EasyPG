import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';
  
  console.error("RAW ERROR CAUGHT:", err);
  
  // Log full error internally with context
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id || (req as any).auth?.userId
  });
  
  // Send safe message to client
  res.status(statusCode).json({ error: message });
};
