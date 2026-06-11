import rateLimit from 'express-rate-limit';

// General API limit
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Try again in 15 minutes.' }
});

// Strict limit for auth routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts.' }
});

// Payment routes
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Too many payment requests.' }
});
