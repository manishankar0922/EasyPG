/**
 * securityHeaders.middleware.ts
 *
 * Hardened security headers beyond bare helmet() defaults.
 *
 * What each header does:
 *
 * Content-Security-Policy (CSP)
 *   Tells browsers which sources of content are legitimate.
 *   Blocks inline scripts, eval(), and third-party resource loading.
 *   This is the #1 defense against XSS after sanitization.
 *
 * Strict-Transport-Security (HSTS)
 *   Forces HTTPS for 1 year, prevents SSL stripping.
 *
 * X-Content-Type-Options: nosniff
 *   Prevents browser from MIME-sniffing — a file upload attack vector.
 *
 * X-Frame-Options: DENY
 *   Blocks clickjacking — prevents embedding in <iframe>.
 *
 * Referrer-Policy: strict-origin-when-cross-origin
 *   Prevents URL leakage (e.g., a URL containing a token) in Referer headers.
 *
 * Permissions-Policy
 *   Disables browser APIs we don't use: camera, microphone, geolocation.
 *   Reduces attack surface if XSS occurs.
 *
 * X-Permitted-Cross-Domain-Policies: none
 *   Blocks Flash/PDF cross-domain requests (legacy vector).
 *
 * Cache-Control: no-store
 *   API responses must never be cached — financial data, tenant PII, etc.
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

// Hardened helmet configuration
export const helmetConfig = helmet({
  // ── Content Security Policy ──────────────────────────────────────────────────
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],               // Block everything by default
      scriptSrc: ["'self'"],                // Only our own scripts
      styleSrc: ["'self'"],                 // Only our own styles
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'], // Cloudinary images OK
      connectSrc: ["'self'"],              // API calls only to self
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],               // Block <object>, <embed>, Flash
      frameSrc: ["'none'"],                // Block <frame> and <iframe>
      frameAncestors: ["'none'"],          // Block embedding in other pages (clickjacking)
      baseUri: ["'self'"],                 // Restrict <base> tag
      formAction: ["'self'"],              // Forms submit only to self
      upgradeInsecureRequests: [],         // Force HTTPS for all requests
    },
  },

  // ── HSTS — force HTTPS for 1 year ────────────────────────────────────────────
  strictTransportSecurity: {
    maxAge: 31536000,        // 1 year in seconds
    includeSubDomains: true, // Apply to all subdomains (admin.*, tenant.*)
    preload: true,           // Submit to HSTS preload list
  },

  // ── Disable X-Powered-By: Express ───────────────────────────────────────────
  hidePoweredBy: true,

  // ── X-Content-Type-Options: nosniff ─────────────────────────────────────────
  noSniff: true,

  // ── X-Frame-Options: DENY ────────────────────────────────────────────────────
  frameguard: { action: 'deny' },

  // ── Referrer-Policy ─────────────────────────────────────────────────────────
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // ── Cross-Origin Opener Policy ──────────────────────────────────────────────
  crossOriginOpenerPolicy: { policy: 'same-origin' },

  // ── Cross-Origin Resource Policy ────────────────────────────────────────────
  crossOriginResourcePolicy: { policy: 'same-origin' },
});

// Additional headers not covered by helmet
export const additionalSecurityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  // Prevent caching of API responses (financial data, PII must never be cached)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Disable browser APIs we don't use
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()'
  );

  // Block cross-domain Flash/PDF requests (legacy attack vector)
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

  // DNS prefetch control — prevent DNS prefetching leaking visited URLs
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  next();
};
