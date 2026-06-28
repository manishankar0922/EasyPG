import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../lib/logger';
import { contextStorage } from '../lib/context';

// Helper to mask sensitive fields
const redactDeep = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactDeep);

  const redacted = { ...obj };
  for (const key in redacted) {
    if (Object.prototype.hasOwnProperty.call(redacted, key)) {
      const lowerKey = key.toLowerCase();
      
      // Mask Passwords and Tokens entirely
      if (lowerKey.includes('password') || lowerKey.includes('token') || lowerKey.includes('secret')) {
        redacted[key] = '[REDACTED]';
      }
      // Mask Aadhaar numbers (usually 12 digits, mask all but last 4)
      else if (lowerKey.includes('aadhaar')) {
        if (typeof redacted[key] === 'string' && redacted[key].length >= 4) {
          redacted[key] = `********${redacted[key].slice(-4)}`;
        } else {
          redacted[key] = '[REDACTED]';
        }
      }
      // Mask Phone numbers (keep last 4 digits)
      else if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
        if (typeof redacted[key] === 'string' && redacted[key].length >= 4) {
          redacted[key] = `XXXXXX${redacted[key].slice(-4)}`;
        } else {
          redacted[key] = '[REDACTED]';
        }
      }
      // Recursively redact nested objects
      else if (typeof redacted[key] === 'object') {
        redacted[key] = redactDeep(redacted[key]);
      }
    }
  }
  return redacted;
};

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  
  // Expose the Request ID to the client
  res.setHeader('X-Request-Id', requestId);

  // Initialize store and run within AsyncLocalStorage context
  const store = new Map<string, any>();
  store.set('requestId', requestId);

  contextStorage.run(store, () => {
    // Listen for the response to finish
    res.on('finish', () => {
      const responseTime = Date.now() - start;
      const userId = (req as any).user?.id || (req as any).auth?.userId || 'anonymous';
      
      const logData: any = {
        method: req.method,
        url: req.originalUrl || req.url,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        userId,
        ip: req.ip,
      };

      if (req.method !== 'GET') {
        logData.payload = redactDeep(req.body);
      }

      if (res.statusCode >= 500) {
        logger.error('API Request Failed', logData);
      } else if (res.statusCode >= 400) {
        logger.warn('API Request Warning', logData);
      } else {
        logger.info('API Request Success', logData);
      }
    });

    next();
  });
};
