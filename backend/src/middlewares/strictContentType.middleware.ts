/**
 * strictContentType.middleware.ts
 *
 * Security Layer: Enforces strict Content-Type validation.
 *
 * Why this is needed:
 * - Attackers often try to bypass WAFs or parsing logic by sending
 *   malformed content types (e.g., application/x-www-form-urlencoded
 *   with a JSON body, or text/plain).
 * - This middleware ensures that if a route expects a body (POST, PUT, PATCH),
 *   it MUST declare application/json.
 * - This prevents CSRF attacks that rely on simple requests (form submissions)
 *   since forms cannot send application/json.
 */

import { Request, Response, NextFunction } from 'express';

export const strictContentTypeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // GET, DELETE, OPTIONS usually don't have bodies, so we don't strictly enforce Content-Type
  // unless they actually send a body (which is non-standard but possible).
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    // If there's no body being sent, we don't need to enforce a Content-Type
    const contentLength = req.headers['content-length'];
    if (!contentLength || contentLength === '0') {
      return next();
    }

    const contentType = req.headers['content-type'];
    
    // Cloudinary upload routes might use multipart/form-data.
    // If the app has file uploads hitting the backend directly, we'd need to whitelist those routes here.
    // However, EasyPG uses Cloudinary directly from the frontend (with signed URLs).
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        success: false,
        error: 'Unsupported Media Type. Only application/json is allowed.',
        code: 'UNSUPPORTED_MEDIA_TYPE'
      });
    }
  }

  next();
};
