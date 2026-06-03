import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validate = (schema: z.ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: error.issues.map((e) => ({
          path: e.path,
          message: e.message,
        })),
      });
    }
    return res.status(500).json({ success: false, error: 'Internal Server Error during validation' });
  }
};
