import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny } from 'zod';
import { ValidationError } from '../shared/errors.js';

export const validate =
  (schema: ZodTypeAny, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const payload: unknown =
      source === 'body' ? req.body : source === 'query' ? req.query : req.params;
    const result = schema.safeParse(payload);

    if (!result.success) {
      throw new ValidationError('Request validation failed', result.error.flatten());
    }

    if (source === 'body') {
      Object.defineProperty(req, 'body', { value: result.data, writable: true, configurable: true });
    } else if (source === 'query') {
      Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true });
    } else {
      Object.defineProperty(req, 'params', { value: result.data, writable: true, configurable: true });
    }

    next();
  };
