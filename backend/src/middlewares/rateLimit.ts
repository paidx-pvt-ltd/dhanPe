import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter (15 requests per 15 minutes)
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET', // Don't limit GET requests
});

/**
 * Auth rate limiter (5 requests per 15 minutes)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
});

/**
 * Payment rate limiter (10 requests per hour)
 */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many payment requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
