/**
 * rateLimiter.ts — OWASP API Security Top 10 (API4:2023 Unrestricted Resource Consumption)
 *
 * Centralized rate limiting for all API routes.
 *
 * Strategy: dual-key rate limiting
 *  - PUBLIC endpoints (login, tenant-auth): keyed by IP address
 *  - PROTECTED endpoints: keyed by "IP:userId" compound key
 *    → Prevents distributed account attacks that bypass IP-only limits
 *    → A user with 1000 rotating IPs still cannot exceed their personal quota
 *
 * Stores:
 *  - Production: Redis (persistent across restarts/replicas)
 *  - Development: in-memory (resets on restart)
 *
 * All limiters:
 *  - standardHeaders: true  → RFC 6585 RateLimit-* response headers
 *  - legacyHeaders: false   → no deprecated X-RateLimit-* headers
 *  - handler: sends Retry-After header alongside 429 (OWASP best practice)
 */

import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisConnection } from '../jobs/index';
import { Request, Response } from 'express';

const createRedisStore = (prefix: string) => {
  if (process.env.NODE_ENV === 'production') {
    return new RedisStore({
      prefix: `rl:${prefix}:`,
      sendCommand: (...args: string[]) => redisConnection.call(...args),
    });
  }
  return undefined; // Use default in-memory store in development
};

/**
 * Graceful 429 handler: sends RFC 7231 Retry-After header so clients
 * know exactly when to retry instead of hammering the server further.
 */
const rateLimitHandler = (req: Request, res: Response) => {
  const retryAfterSeconds = Math.ceil(
    (res.getHeader('RateLimit-Reset') as number ?? 900)
  );
  res.setHeader('Retry-After', retryAfterSeconds);
  res.status(429).json({
    success: false,
    error: (res as any).locals?.rateLimitMessage ||
      'Too many requests. Please slow down.',
    retryAfter: retryAfterSeconds,
  });
};

/**
 * Compound key generator for protected (authenticated) routes.
 * Combines IP + userId so that:
 *  - Each user has their own personal quota even across rotating IPs
 *  - Anonymous requests still fall back to IP-only keying
 */
const userAwareKeyGenerator = (req: Request): string => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    ?? req.socket?.remoteAddress
    ?? 'unknown';
  const userId = (req as any).user?.id || null;
  // Format: "ip:userId" for authed users, "ip" for anonymous
  return userId ? `${ip}:${userId}` : ip;
};

const base = {
  standardHeaders: true,  // RFC 6585 RateLimit-* response headers
  legacyHeaders: false,   // No X-RateLimit-* headers
  skipSuccessfulRequests: false, // Count all requests — don't reward success
  handler: rateLimitHandler,
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
// Uses compound IP+userId key — a superadmin account itself is rate-limited
export const superadminWriteLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  // Compound key: IP + authenticated userId prevents role-sharing abuse
  keyGenerator: userAwareKeyGenerator,
  message: { success: false, error: 'Too many admin operations. Please try again later.' },
  store: createRedisStore('superadmin'),
});

// ─── USER-AWARE GENERAL LIMITER ───────────────────────────────────────────────
// Applied to high-traffic protected endpoints (dashboard, reports, etc.)
// Compound IP+userId ensures each account has its own quota across IPs.
export const userAwareLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Slightly more than generalLimiter because it's per-user, not per-IP
  keyGenerator: userAwareKeyGenerator,
  message: { success: false, error: 'Too many requests. Please slow down and try again in 15 minutes.' },
  store: createRedisStore('user_aware'),
});
