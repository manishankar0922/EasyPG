import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisConnection } from '../jobs/index';

const createRedisStore = () => {
  if (process.env.NODE_ENV === 'production') {
    return new RedisStore({
      sendCommand: (...args: string[]) => redisConnection.call(...args),
    });
  }
  return undefined; // Use default memory store in development
};

// General API limit
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Try again in 15 minutes.' },
  store: createRedisStore()
});

// Strict limit for auth routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts.' },
  store: createRedisStore()
});

// Payment routes
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Too many payment requests.' },
  store: createRedisStore()
});
