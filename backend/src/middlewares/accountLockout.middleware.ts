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
import { redisConnection, hasRedis } from '../jobs/index';
import logger from '../lib/logger';

interface LockoutEntry {
  attempts: number;
  lockedUntil: number | null;  // epoch ms — null means not currently locked
  lockCount: number;           // how many times this account has been locked
}

// In-memory store (fallback for dev)
const memoryStore = new Map<string, LockoutEntry>();

const MAX_ATTEMPTS = 5;  // Failed attempts before lockout
const LOCKOUT_DURATIONS = [
  15 * 60 * 1000,   // 1st lockout: 15 minutes
  60 * 60 * 1000,   // 2nd lockout: 1 hour
  24 * 60 * 60 * 1000, // 3rd+ lockout: 24 hours
];

const WINDOW_MS = 30 * 60 * 1000; // Reset attempt counter after 30 min of no failures
const isProd = hasRedis; // real Redis only when REDIS_URL is set — else in-memory fallback

const getEntry = async (identifier: string): Promise<LockoutEntry | null> => {
  if (isProd) {
    try {
      const data = await redisConnection.get(`lockout:${identifier}`);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.error('Redis getEntry error', { error: err });
      return null;
    }
  }
  return memoryStore.get(identifier) || null;
};

const setEntry = async (identifier: string, entry: LockoutEntry, ttlMs: number): Promise<void> => {
  if (isProd) {
    try {
      await redisConnection.set(`lockout:${identifier}`, JSON.stringify(entry), 'PX', ttlMs);
    } catch (err) {
      logger.error('Redis setEntry error', { error: err });
    }
    return;
  }
  
  memoryStore.set(identifier, entry);
  setTimeout(() => {
    const current = memoryStore.get(identifier);
    if (current && !current.lockedUntil && Date.now() >= (Date.now() + ttlMs - 1000)) { // rough check
      memoryStore.delete(identifier);
    }
  }, ttlMs);
};

const deleteEntry = async (identifier: string): Promise<void> => {
  if (isProd) {
    try {
      await redisConnection.del(`lockout:${identifier}`);
    } catch (err) {
      logger.error('Redis deleteEntry error', { error: err });
    }
    return;
  }
  memoryStore.delete(identifier);
};

/**
 * Records a FAILED login attempt for the given identifier.
 * Returns { locked: true, lockedUntil } if the account should now be locked.
 */
export const recordFailedAttempt = async (identifier: string): Promise<{ locked: boolean; lockedUntil?: Date; remainingAttempts?: number }> => {
  const now = Date.now();
  let existing = await getEntry(identifier) ?? { attempts: 0, lockedUntil: null, lockCount: 0 };

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

    // ttl is max of lockDuration or window
    await setEntry(identifier, existing, Math.max(lockDuration, WINDOW_MS));
    return { locked: true, lockedUntil: new Date(existing.lockedUntil) };
  }

  await setEntry(identifier, existing, WINDOW_MS);

  return {
    locked: false,
    remainingAttempts: MAX_ATTEMPTS - existing.attempts,
  };
};

/**
 * Clears the lockout state for an identifier after a SUCCESSFUL login.
 */
export const clearLockout = async (identifier: string): Promise<void> => {
  await deleteEntry(identifier);
};

/**
 * Checks if an identifier is currently locked.
 * Use at the start of login handlers to reject locked accounts early.
 */
export const checkLockout = async (identifier: string): Promise<{ locked: boolean; lockedUntil?: Date }> => {
  const now = Date.now();
  const entry = await getEntry(identifier);

  if (!entry || !entry.lockedUntil) return { locked: false };
  
  if (now >= entry.lockedUntil) {
    // Lock expired
    entry.lockedUntil = null;
    entry.attempts = 0;
    await setEntry(identifier, entry, WINDOW_MS);
    return { locked: false };
  }

  return { locked: true, lockedUntil: new Date(entry.lockedUntil) };
};

/**
 * Express middleware to check lockout before processing the body.
 * Expects the identifier in req.body.email or req.body.phone.
 * Must be called AFTER body parsing middleware.
 */
export const accountLockoutMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const identifier = (req.body?.email || req.body?.phone || '').toString().toLowerCase().trim();

    if (!identifier) {
      next();
      return;
    }

    const { locked, lockedUntil } = await checkLockout(identifier);

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
  } catch (err) {
    next(err);
  }
};
