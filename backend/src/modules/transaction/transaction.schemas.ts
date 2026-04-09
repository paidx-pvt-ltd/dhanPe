import { z } from 'zod';

export const transactionParamsSchema = z.object({
  id: z.string().min(1),
});

export const transactionListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
});
