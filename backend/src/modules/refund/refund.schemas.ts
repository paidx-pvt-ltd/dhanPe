import { z } from 'zod';

export const createRefundSchema = z.object({
  amount: z.number().positive().max(1000000).optional(),
  reason: z.string().trim().min(3).max(255).optional(),
  refundId: z.string().trim().min(1).max(64).optional(),
});

export const refundParamsSchema = z.object({
  transactionId: z.string().trim().min(1),
});

export const refundSyncParamsSchema = z.object({
  refundId: z.string().trim().min(1),
});

export type CreateRefundDto = z.infer<typeof createRefundSchema>;
