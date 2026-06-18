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

interface StrikeInfo {
  strikes: number;
  bannedUntil: number | null;
}

// In-memory store (Replace with Redis in production for cross-instance blocking)
const ipStrikes = new Map<string, StrikeInfo>();

const MAX_STRIKES = 10;           // Ban after 10 suspicious actions
const BAN_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const STRIKE_DECAY = 60 * 60 * 1000;     // 1 hour to forgive 1 strike (not implemented fully here, but good practice)

export const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
};

/**
 * Middleware to drop requests from banned IPs immediately.
 */
export const ipBlacklistMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const ip = getClientIp(req);
  const info = ipStrikes.get(ip);

  if (info && info.bannedUntil) {
    if (Date.now() < info.bannedUntil) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. Your IP has been temporarily banned due to suspicious activity.',
        code: 'IP_BANNED'
      });
    } else {
      // Ban expired
      ipStrikes.delete(ip);
    }
  }

  next();
};

/**
 * Utility to add a strike to an IP. Use this in error handlers or honeypots.
 */
export const addIpStrike = (ip: string, reason: string) => {
  if (ip === 'unknown') return;

  const info = ipStrikes.get(ip) || { strikes: 0, bannedUntil: null };
  info.strikes += 1;

  if (info.strikes >= MAX_STRIKES) {
    info.bannedUntil = Date.now() + BAN_DURATION;
    logger.warn(`🛑 IP BANNED: ${ip}. Reason: ${reason}. Strikes: ${info.strikes}`);
  } else {
    logger.info(`⚠️ IP Strike added: ${ip}. Reason: ${reason}. Total strikes: ${info.strikes}`);
  }

  ipStrikes.set(ip, info);
};

/**
 * Express Middleware: Honeypot trap.
 * Place this on hidden routes (e.g., /admin-login.php, /.env)
 * Any bot hitting this gets instant strikes.
 */
export const honeypotTrap = (req: Request, res: Response) => {
  const ip = getClientIp(req);
  // Add 5 strikes instantly for hitting a honeypot
  for(let i=0; i<5; i++) addIpStrike(ip, 'Accessed honeypot route');
  
  // Pretend it doesn't exist
  res.status(404).json({ success: false, error: 'Not found' });
};
