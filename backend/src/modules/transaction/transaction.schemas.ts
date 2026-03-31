import { z } from 'zod';

export const transactionParamsSchema = z.object({
  id: z.string().min(1),
});
