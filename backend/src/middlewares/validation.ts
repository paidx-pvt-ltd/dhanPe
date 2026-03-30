import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

// Type-safe request validation middleware
export const validate =
  (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params;

    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      throw new ValidationError(`Validation failed: ${errors}`);
    }

    // Replace with validated data
    if (source === 'body') {
      req.body = result.data;
    } else if (source === 'query') {
      req.query = result.data;
    } else {
      req.params = result.data;
    }

    next();
  };
