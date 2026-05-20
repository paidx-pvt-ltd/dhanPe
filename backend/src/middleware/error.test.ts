import { describe, expect, it, vi } from 'vitest';
import type { AxiosError } from 'axios';
import type { NextFunction, Request, Response } from 'express';
import { errorHandler } from './error.js';
import { ExternalServiceError } from '../shared/errors.js';
import { logger } from '../config/logger.js';

describe('ExternalServiceError', () => {
  it('sanitizes AxiosError details before storing them', () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Bad Gateway',
      code: 'ECONNABORTED',
      response: {
        status: 502,
        statusText: 'Bad Gateway',
        data: { error: 'provider failure' },
      },
      config: {
        data: {
          authkey: 'SECRET_AUTH_KEY',
          'access-token': 'attacker-token',
        },
        headers: {
          Authorization: 'Bearer secret',
        },
      },
    } as unknown as AxiosError;

    const error = new ExternalServiceError('Failed to verify widget token', axiosError);

    expect(error.details).toEqual({
      message: 'Bad Gateway',
      code: 'ECONNABORTED',
      status: 502,
      statusText: 'Bad Gateway',
      responseData: { error: 'provider failure' },
    });
  });
});

describe('errorHandler', () => {
  it('returns sanitized error details for ExternalServiceError responses', () => {
    const axiosError = {
      isAxiosError: true,
      message: 'Bad Gateway',
      code: 'ECONNABORTED',
      response: {
        status: 502,
        statusText: 'Bad Gateway',
        data: { error: 'provider failure' },
      },
      config: {
        data: {
          authkey: 'SECRET_AUTH_KEY',
          'access-token': 'attacker-token',
        },
      },
    } as unknown as AxiosError;

    const error = new ExternalServiceError('Failed to verify widget token', axiosError);
    const json = vi.fn();
    const status = vi.fn(() => ({ json } as unknown as Response));
    const res = { status, json } as unknown as Response;
    const req = { path: '/api/auth/verify-widget', method: 'POST', userId: 'user-123' } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;

    const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    try {
      errorHandler(error, req, res, next);
    } finally {
      loggerSpy.mockRestore();
    }

    expect(status).toHaveBeenCalledWith(502);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'EXTERNAL_SERVICE_ERROR',
        message: 'Failed to verify widget token',
        details: {
          message: 'Bad Gateway',
          code: 'ECONNABORTED',
          status: 502,
          statusText: 'Bad Gateway',
          responseData: { error: 'provider failure' },
        },
      },
    });
  });
});
