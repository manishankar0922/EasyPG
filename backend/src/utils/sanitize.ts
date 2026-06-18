/**
 * sanitize.ts — Server-side input sanitization utilities
 *
 * All user-supplied string inputs must be sanitized before use.
 * These helpers strip dangerous characters that could be used for:
 *  - XSS (Cross-Site Scripting) — script/HTML tag injection
 *  - NoSQL/SQL injection pattern-alike issues with special chars
 *  - Log injection (newlines used to fake log entries)
 *
 * Note: Prisma uses parameterized queries, so SQL injection is NOT a risk
 * for DB operations, but we still sanitize to protect:
 *  1. Any data that gets rendered in the frontend as HTML
 *  2. Logs and error messages that might be displayed elsewhere
 */

const SCRIPT_TAG_REGEX = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;
const HTML_TAG_REGEX = /<[^>]*>/g;
const EVENT_HANDLER_REGEX = /on\w+\s*=/gi; // onclick=, onload=, etc.
const JAVASCRIPT_PROTO_REGEX = /javascript\s*:/gi;
const DATA_PROTO_REGEX = /data\s*:/gi;
const LOG_INJECTION_REGEX = /[\r\n]/g;

/**
 * Sanitize a plain-text string field.
 * Use for: names, addresses, notes, descriptions.
 */
export const sanitizeText = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value
    .replace(SCRIPT_TAG_REGEX, '')
    .replace(HTML_TAG_REGEX, '')
    .replace(EVENT_HANDLER_REGEX, '')
    .replace(JAVASCRIPT_PROTO_REGEX, '')
    .replace(LOG_INJECTION_REGEX, ' ')
    .trim()
    .substring(0, 2000); // Hard limit on length
};

/**
 * Sanitize an email address field.
 */
export const sanitizeEmail = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  // Remove all characters not valid in an email address
  return value.toLowerCase().trim().replace(/[^a-z0-9@._+\-]/g, '').substring(0, 254);
};

/**
 * Sanitize a phone number field.
 */
export const sanitizePhone = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.replace(/[^0-9+\-() ]/g, '').trim().substring(0, 20);
};

/**
 * Sanitize a URL (photo, avatar, document links).
 * Rejects javascript: and data: URIs.
 */
export const sanitizeUrl = (value: unknown): string | null => {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.trim();
  if (JAVASCRIPT_PROTO_REGEX.test(cleaned) || DATA_PROTO_REGEX.test(cleaned)) return null;
  // Only allow http/https/relative URLs
  if (!/^https?:\/\//i.test(cleaned) && !cleaned.startsWith('/')) return null;
  return cleaned.substring(0, 1024);
};

/**
 * Sanitize all string fields in a plain object (shallow).
 * Safe to call on req.body before processing.
 */
export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): T => {
  const result = { ...obj };
  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      const val = result[key];
      if (typeof val === 'string') {
        // Apply appropriate sanitizer based on field name convention
        const lk = key.toLowerCase();
        if (lk.includes('email')) {
          (result as any)[key] = sanitizeEmail(val);
        } else if (lk.includes('phone') || lk.includes('mobile')) {
          (result as any)[key] = sanitizePhone(val);
        } else if (lk.includes('url') || lk.includes('photo') || lk.includes('avatar') || lk.includes('image')) {
          (result as any)[key] = sanitizeUrl(val);
        } else {
          (result as any)[key] = sanitizeText(val);
        }
      }
    }
  }
  return result;
};
