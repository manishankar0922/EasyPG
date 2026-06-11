/**
 * Sanitizes response objects by stripping out sensitive data.
 * This ensures internal tracking fields or secrets never leak to the client.
 */

const sensitiveKeys = [
  'clerkId',
  'password',
  'internalNotes',
  'deletedAt',
  'createdBy',
  'updatedBy'
];

export const sanitizeResponse = <T>(data: T): T => {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponse(item)) as unknown as T;
  }

  if (typeof data === 'object' && !(data instanceof Date)) {
    const sanitized = { ...data } as any;
    
    for (const key in sanitized) {
      if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
        // Strip out exact matches
        if (sensitiveKeys.includes(key)) {
          delete sanitized[key];
        }
        // Strip out any keys ending in "Hash" or "Secret"
        else if (key.endsWith('Hash') || key.endsWith('Secret')) {
          delete sanitized[key];
        }
        // Recursively sanitize nested objects
        else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          sanitized[key] = sanitizeResponse(sanitized[key]);
        }
      }
    }
    
    return sanitized as T;
  }

  return data;
};
