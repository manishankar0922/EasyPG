import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Universal validator that handles direct object schemas or { body, params, query } schemas
export const validate = (schema: ZodSchema) => 
  (req: Request, res: Response, next: NextFunction) => {
    // Determine if the schema expects the full req object or just body
    let dataToValidate = req.body;
    
    // Most existing EasyPG schemas use the { body: z.object(...) } pattern
    // We sniff it out by checking if it's an object schema with a 'body' property
    // (ZodObject has a shape property)
    if ((schema as any).shape && ((schema as any).shape.body || (schema as any).shape.params || (schema as any).shape.query)) {
      dataToValidate = { body: req.body, query: req.query, params: req.params };
    }

    const result = schema.safeParse(dataToValidate);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors
      });
    }

    // Assign back validated data (useful for transforms/defaults)
    if ((schema as any).shape && ((schema as any).shape.body || (schema as any).shape.params || (schema as any).shape.query)) {
      req.body = (result.data as any).body || req.body;
      req.query = (result.data as any).query || req.query;
      req.params = (result.data as any).params || req.params;
    } else {
      req.body = result.data;
    }
    
    next();
  };

// Example new schema for creating tenant as requested
export const createTenantSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  branchId: z.string().cuid(),
  bedId: z.string().cuid(),
  moveInDate: z.string().datetime(),
  monthlyRent: z.number().min(100).max(100000)
});
