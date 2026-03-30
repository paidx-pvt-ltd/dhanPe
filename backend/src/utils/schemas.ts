import { z } from 'zod';

// Auth Schemas
export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name is required').optional(),
  lastName: z.string().min(2, 'Last name is required').optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Payment Schemas
export const createPaymentSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  description: z.string().optional(),
});

export const updatePaymentStatusSchema = z.object({
  status: z.enum(['SUCCESS', 'FAILED', 'CANCELLED']),
});

// Transaction Schemas
export const transactionQuerySchema = z.object({
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED']).optional(),
  type: z.enum(['DEBIT', 'CREDIT', 'REFUND']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().non_negative().default(0),
});

// Webhook Schema
export const webhookSchema = z.object({
  event: z.string(),
  data: z.record(z.any()),
  timestamp: z.string().optional(),
});

type SignupRequest = z.infer<typeof signupSchema>;
type LoginRequest = z.infer<typeof loginSchema>;
type CreatePaymentRequest = z.infer<typeof createPaymentSchema>;
type TransactionQuery = z.infer<typeof transactionQuerySchema>;
type WebhookData = z.infer<typeof webhookSchema>;

export {
  SignupRequest,
  LoginRequest,
  CreatePaymentRequest,
  TransactionQuery,
  WebhookData,
};
