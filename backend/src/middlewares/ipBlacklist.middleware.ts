/**
 * ipBlacklist.middleware.ts
 *
 * Security Layer: Dynamic IP Blacklisting / WAF (Web Application Firewall)
 *
 * - Bans IPs that exhibit malicious behavior (e.g., hitting honeypots, generating
 *   too many 401/403 errors, or sending malformed payloads).
 * - Banned IPs get a fast 403 response, completely bypassing the app logic, DB,
 *   and rate limiters to save server resources.
 * - In production, this should ideally be pushed to Cloudflare/AWS WAF, but having
 *   it at the application layer provides defense-in-depth.
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';
import { redisConnection, hasRedis } from '../jobs/index';

interface StrikeInfo {
  strikes: number;
  bannedUntil: number | null;
}

// In-memory store (Fallback for dev)
const memoryStrikes = new Map<string, StrikeInfo>();

const MAX_STRIKES = 10;           // Ban after 10 suspicious actions
const BAN_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const isProd = hasRedis; // real Redis only when REDIS_URL is set — else in-memory fallback

// SECURITY: req.ip is derived via Express "trust proxy" (index.ts) from the
// proxy-appended hop of X-Forwarded-For. Never parse the raw header ourselves —
// the first entries are client-controlled, letting an attacker spoof any IP to
// dodge bans or get innocent IPs banned.
export const getClientIp = (req: Request): string =>
  req.ip || req.socket.remoteAddress || 'unknown';

const getStrike = async (ip: string): Promise<StrikeInfo | null> => {
  if (isProd) {
    try {
      const data = await redisConnection.get(`ip_strike:${ip}`);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      logger.error('Redis getStrike error', { error: err });
      return null;
    }
  }
  return memoryStrikes.get(ip) || null;
};

const setStrike = async (ip: string, info: StrikeInfo, ttlMs: number): Promise<void> => {
  if (isProd) {
    try {
      await redisConnection.set(`ip_strike:${ip}`, JSON.stringify(info), 'PX', ttlMs);
    } catch (err) {
      logger.error('Redis setStrike error', { error: err });
    }
    return;
  }
  memoryStrikes.set(ip, info);
  setTimeout(() => {
    const current = memoryStrikes.get(ip);
    if (current && Date.now() >= (Date.now() + ttlMs - 1000)) {
      memoryStrikes.delete(ip);
    }
  }, ttlMs);
};

const deleteStrike = async (ip: string): Promise<void> => {
  if (isProd) {
    try {
      await redisConnection.del(`ip_strike:${ip}`);
    } catch (err) {
      logger.error('Redis deleteStrike error', { error: err });
    }
    return;
  }
  memoryStrikes.delete(ip);
};

/**
 * Middleware to drop requests from banned IPs immediately.
 */
export const ipBlacklistMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const ip = getClientIp(req);
    const info = await getStrike(ip);

    if (info && info.bannedUntil) {
      if (Date.now() < info.bannedUntil) {
        res.status(403).json({
          success: false,
          error: 'Forbidden. Your IP has been temporarily banned due to suspicious activity.',
          code: 'IP_BANNED'
        });
        return;
      } else {
        // Ban expired
        await deleteStrike(ip);
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Utility to add a strike to an IP. Use this in error handlers or honeypot.
 */
export const addIpStrike = async (ip: string, reason: string): Promise<void> => {
  if (ip === 'unknown') return;

  const info = await getStrike(ip) || { strikes: 0, bannedUntil: null };
  info.strikes += 1;
  let ttl = 60 * 60 * 1000; // 1 hour memory

  if (info.strikes >= MAX_STRIKES) {
    info.bannedUntil = Date.now() + BAN_DURATION;
    ttl = BAN_DURATION;
    logger.warn(`🛑 IP BANNED: ${ip}. Reason: ${reason}. Strikes: ${info.strikes}`);
  } else {
    logger.info(`⚠️ IP Strike added: ${ip}. Reason: ${reason}. Total strikes: ${info.strikes}`);
  }

  await setStrike(ip, info, ttl);
};

/**
 * Express Middleware: Honeypot trap.
 * Place this on hidden routes (e.g., /admin-login.php, /.env)
 * Any bot hitting this gets instant strikes.
 */
export const honeypotTrap = async (req: Request, res: Response): Promise<void> => {
  const ip = getClientIp(req);
  // Add 5 strikes instantly for hitting a honeypot
  for(let i = 0; i < 5; i++) {
    await addIpStrike(ip, 'Accessed honeypot route');
  }
  
  // Pretend it doesn't exist
  res.status(404).json({ success: false, error: 'Not found' });
};
