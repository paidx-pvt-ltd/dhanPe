import { z } from 'zod';

export const payoutParamsSchema = z.object({
  transactionId: z.string().min(1),
});
