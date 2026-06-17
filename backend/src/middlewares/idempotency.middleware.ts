import { Request, Response, NextFunction } from 'express';
import { redisConnection } from '../jobs/index';

export const idempotencyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'POST' && req.method !== 'PATCH' && req.method !== 'PUT') {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] as string;
  
  if (!idempotencyKey) {
    // Proceed if no idempotency key provided (for backwards compatibility),
    // but ideally clients should start sending this for critical mutations.
    return next();
  }

  try {
    const key = `idempotency:${idempotencyKey}`;
    const existingResponse = await redisConnection.get(key);

    if (existingResponse) {
      console.log(`[Idempotency] Returning cached response for key: ${idempotencyKey}`);
      const parsed = JSON.parse(existingResponse);
      return res.status(parsed.status).json(parsed.body);
    }

    // Intercept res.json to cache the outgoing response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      // Only cache success responses to avoid caching 4xx/5xx errors incorrectly
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const responseToCache = {
          status: res.statusCode,
          body
        };
        // Cache for 24 hours
        redisConnection.setex(key, 86400, JSON.stringify(responseToCache)).catch((err: any) => {
          console.error('[Idempotency] Failed to cache response', err);
        });
      }
      return originalJson(body);
    };

    next();
  } catch (error) {
    console.error('[Idempotency] Middleware Redis error', error);
    next();
  }
};
