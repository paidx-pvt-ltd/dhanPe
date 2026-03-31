import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny } from 'zod';
import { ValidationError } from '../shared/errors.js';

export const validate =
  (schema: ZodTypeAny, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const payload = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
    const result = schema.safeParse(payload);

    if (!result.success) {
      throw new ValidationError('Request validation failed', result.error.flatten());
    }

    if (source === 'body') {
      req.body = result.data;
    } else if (source === 'query') {
      req.query = result.data;
    } else {
      req.params = result.data;
    }

    next();
  };
