/**
 * accountLockout.middleware.ts
 *
 * Per-account lockout after N failed login attempts.
 *
 * Why this is needed beyond IP rate limiting:
 *  - IP rate limiting can be bypassed with rotating proxies
 *  - Account lockout targets the specific account being attacked
 *  - Even if attacker has 1000 IPs, they still get locked out of the target account
 *
 * How it works:
 *  - Uses in-memory Map in development (resets on restart)
 *  - Designed to use Redis in production for persistence across restarts
 *  - After MAX_ATTEMPTS failures for the same identifier (email/phone):
 *    → Returns 423 Locked with unlock time
 *    → Lockout duration increases exponentially with repeated violations
 *
 * Lockout schedule:
 *  1st lockout → 15 minutes
 *  2nd lockout → 1 hour
 *  3rd+ lockout → 24 hours
 */

import { Request, Response, NextFunction } from 'express';

interface LockoutEntry {
  attempts: number;
  lockedUntil: number | null;  // epoch ms — null means not currently locked
  lockCount: number;           // how many times this account has been locked
}

// In-memory store (replace with Redis adapter in production)
const lockoutStore = new Map<string, LockoutEntry>();

const MAX_ATTEMPTS = 5;  // Failed attempts before lockout
const LOCKOUT_DURATIONS = [
  15 * 60 * 1000,   // 1st lockout: 15 minutes
  60 * 60 * 1000,   // 2nd lockout: 1 hour
  24 * 60 * 60 * 1000, // 3rd+ lockout: 24 hours
];

const WINDOW_MS = 30 * 60 * 1000; // Reset attempt counter after 30 min of no failures

/**
 * Records a FAILED login attempt for the given identifier.
 * Returns { locked: true, lockedUntil } if the account should now be locked.
 */
export const recordFailedAttempt = (identifier: string): { locked: boolean; lockedUntil?: Date; remainingAttempts?: number } => {
  const now = Date.now();
  const existing = lockoutStore.get(identifier) ?? { attempts: 0, lockedUntil: null, lockCount: 0 };

  // If currently locked, reject immediately
  if (existing.lockedUntil && now < existing.lockedUntil) {
    return { locked: true, lockedUntil: new Date(existing.lockedUntil) };
  }

  // Lock expired or first attempt — reset lock if expired
  if (existing.lockedUntil && now >= existing.lockedUntil) {
    existing.attempts = 0;
    existing.lockedUntil = null;
  }

  existing.attempts += 1;

  if (existing.attempts >= MAX_ATTEMPTS) {
    // Apply lockout
    const lockDurationIndex = Math.min(existing.lockCount, LOCKOUT_DURATIONS.length - 1);
    const lockDuration = LOCKOUT_DURATIONS[lockDurationIndex];
    existing.lockedUntil = now + lockDuration;
    existing.lockCount += 1;
    existing.attempts = 0; // Reset counter after applying lockout

    lockoutStore.set(identifier, existing);
    return { locked: true, lockedUntil: new Date(existing.lockedUntil) };
  }

  lockoutStore.set(identifier, existing);

  // Schedule cleanup to avoid memory growth
  setTimeout(() => {
    const entry = lockoutStore.get(identifier);
    if (entry && !entry.lockedUntil && Date.now() - now > WINDOW_MS) {
      lockoutStore.delete(identifier);
    }
  }, WINDOW_MS);

  return {
    locked: false,
    remainingAttempts: MAX_ATTEMPTS - existing.attempts,
  };
};

/**
 * Clears the lockout state for an identifier after a SUCCESSFUL login.
 */
export const clearLockout = (identifier: string): void => {
  lockoutStore.delete(identifier);
};

/**
 * Checks if an identifier is currently locked.
 * Use at the start of login handlers to reject locked accounts early.
 */
export const checkLockout = (identifier: string): { locked: boolean; lockedUntil?: Date } => {
  const now = Date.now();
  const entry = lockoutStore.get(identifier);

  if (!entry || !entry.lockedUntil) return { locked: false };
  if (now >= entry.lockedUntil) {
    // Lock expired
    entry.lockedUntil = null;
    entry.attempts = 0;
    lockoutStore.set(identifier, entry);
    return { locked: false };
  }

  return { locked: true, lockedUntil: new Date(entry.lockedUntil) };
};

/**
 * Express middleware to check lockout before processing the body.
 * Expects the identifier in req.body.email or req.body.phone.
 * Must be called AFTER body parsing middleware.
 */
export const accountLockoutMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const identifier = (req.body?.email || req.body?.phone || '').toString().toLowerCase().trim();

  if (!identifier) {
    next();
    return;
  }

  const { locked, lockedUntil } = checkLockout(identifier);

  if (locked) {
    res.status(423).json({
      success: false,
      error: 'Account temporarily locked due to too many failed login attempts.',
      lockedUntil: lockedUntil?.toISOString(),
      retryAfter: lockedUntil ? Math.ceil((lockedUntil.getTime() - Date.now()) / 1000) : null,
    });
    return;
  }

  next();
};
