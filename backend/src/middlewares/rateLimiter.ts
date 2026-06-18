/**
 * rateLimiter.ts
 *
 * Centralized rate limiting for all API routes.
 * Uses Redis store in production (persistent across restarts/replicas).
 * Falls back to in-memory store in development (resets on restart).
 *
 * All limiters use:
 *  - standardHeaders: true  → sends RFC 6585 RateLimit-* headers
 *  - legacyHeaders: false   → suppresses old X-RateLimit-* headers
 *  - skipSuccessfulRequests: false → successful logins count toward limit
 */

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisConnection } from '../jobs/index';

const createRedisStore = (prefix: string) => {
  if (process.env.NODE_ENV === 'production') {
    return new RedisStore({
      prefix: `rl:${prefix}:`,
      sendCommand: (...args: string[]) => redisConnection.call(...args),
    });
  }
  return undefined; // Use default in-memory store in development
};

const base = {
  standardHeaders: true,  // RFC 6585 RateLimit-* response headers
  legacyHeaders: false,   // No X-RateLimit-* headers
  skipSuccessfulRequests: false, // Count all requests — don't reward success
};

// ─── GENERAL ─────────────────────────────────────────────────────────────────
// Applied globally to ALL /api/* routes as baseline protection
export const generalLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { success: false, error: 'Too many requests. Please slow down and try again in 15 minutes.' },
  store: createRedisStore('general'),
});

// ─── AUTH — LOGIN ─────────────────────────────────────────────────────────────
// STRICT: max 5 attempts per 15 minutes per IP
// Prevents brute-force attacks on /auth/login and /auth/create-owner
export const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // ← 5 attempts max (user requirement)
  message: { success: false, error: 'Too many login attempts. You have been temporarily blocked. Please wait 15 minutes.' },
  store: createRedisStore('auth'),
});

// ─── TENANT AUTH — LOGIN ──────────────────────────────────────────────────────
// Same strict limit for tenant portal login (/tenant-auth/login)
export const tenantAuthLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 5, // ← 5 attempts max
  message: { success: false, error: 'Too many login attempts. You have been temporarily blocked. Please wait 15 minutes.' },
  store: createRedisStore('tenant_auth'),
});

// ─── PASSWORD RESET ───────────────────────────────────────────────────────────
// Very strict: max 3 password reset requests per hour per IP
export const passwordResetLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { success: false, error: 'Too many password reset attempts. Please wait 1 hour before trying again.' },
  store: createRedisStore('pwd_reset'),
});

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────
// Prevents double-click payment spam and automated abuse
export const paymentLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { success: false, error: 'Too many payment requests. Please try again in a minute.' },
  store: createRedisStore('payment'),
});

// ─── UPLOADS ─────────────────────────────────────────────────────────────────
// Cloudinary signature endpoint — prevent scraping/abuse
export const uploadLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, error: 'Too many upload requests. Please wait a minute.' },
  store: createRedisStore('upload'),
});

// ─── SUPERADMIN WRITES ────────────────────────────────────────────────────────
// Organisation creation, deletion, subscription changes
export const superadminWriteLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: { success: false, error: 'Too many admin operations. Please try again later.' },
  store: createRedisStore('superadmin'),
});
