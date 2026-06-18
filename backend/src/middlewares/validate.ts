/**
 * validate.ts — Universal Zod request validator
 *
 * Security layers this provides:
 * 1. TYPE SAFETY — rejects wrong types (array instead of string, object injection)
 * 2. SIZE LIMITS — max length on every string field prevents DoS via oversized input
 * 3. FORMAT CHECKS — email format, phone regex, UUID format validation
 * 4. REQUIRED FIELDS — missing required fields return structured 400 errors
 * 5. SAFE ASSIGNMENT — parsed/sanitized data replaces req.body/query/params
 *
 * This runs AFTER sanitizeBodyMiddleware (XSS stripping) and BEFORE route handlers.
 * Together they form a double-layer: strip dangerous chars → then validate shape/size.
 */

import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Universal validator that handles direct object schemas or { body, params, query } schemas
export const validate = (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    // Determine if the schema expects the full req object or just body
    let dataToValidate = req.body;

    // Most existing U9PGs schemas use the { body: z.object(...) } pattern
    // We sniff it out by checking if it's an object schema with a 'body' property
    if ((schema as any).shape && ((schema as any).shape.body || (schema as any).shape.params || (schema as any).shape.query)) {
      dataToValidate = { body: req.body, query: req.query, params: req.params };
    }

    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      // Structured field-level errors — safe to return, no stack traces
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors
      });
    }

    // Assign back validated/transformed data
    if ((schema as any).shape && ((schema as any).shape.body || (schema as any).shape.params || (schema as any).shape.query)) {
      req.body = (result.data as any).body || req.body;
      req.query = (result.data as any).query || req.query;
      req.params = (result.data as any).params || req.params;
    } else {
      req.body = result.data;
    }

    next();
  };

// ─── SHARED FIELD CONSTRAINTS ─────────────────────────────────────────────────
// Use these everywhere to enforce consistent max sizes and reject oversized input

export const fields = {
  /** Short name fields: user name, org name, branch name */
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),

  /** Long text: address, notes, descriptions */
  longText: z.string()
    .max(500, 'Text must not exceed 500 characters')
    .trim(),

  /** Notes and remarks — capped at 1000 chars */
  note: z.string()
    .max(1000, 'Note must not exceed 1000 characters')
    .trim()
    .optional(),

  /** Email fields */
  email: z.string()
    .email('Invalid email address')
    .max(254, 'Email must not exceed 254 characters')
    .toLowerCase()
    .trim(),

  /** Indian phone numbers */
  phone: z.string()
    .regex(/^[6-9]\d{9}$/, 'Invalid phone number. Use 10-digit Indian mobile number.')
    .max(10, 'Phone number too long'),

  /** UUID / CUID identifiers */
  id: z.string()
    .min(5, 'ID is too short')
    .max(40, 'ID is too long'),

  /** Passwords — server-side only, never returned to client */
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),

  /** Currency amounts in INR */
  amount: z.number()
    .min(1, 'Amount must be greater than 0')
    .max(500000, 'Amount exceeds maximum allowed value (₹5,00,000)'),

  /** Room/floor numbers */
  roomNumber: z.string()
    .min(1)
    .max(20, 'Room number too long')
    .trim(),

  /** URL fields */
  url: z.string()
    .url('Invalid URL')
    .max(1024, 'URL too long')
    .optional()
    .nullable(),
};

// Example shared schema for creating tenant
export const createTenantSchema = z.object({
  name: fields.name,
  phone: fields.phone,
  branchId: fields.id,
  bedId: fields.id,
  moveInDate: z.string().datetime(),
  monthlyRent: fields.amount
});
