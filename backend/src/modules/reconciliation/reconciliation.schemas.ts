import { z } from 'zod';

export const runReconciliationSchema = z.object({
  scope: z.enum(['PAYMENT', 'PAYOUT', 'REFUND']).optional(),
});

export const reconciliationRunParamsSchema = z.object({
  runId: z.string().trim().min(1),
});

export const reconciliationItemsQuerySchema = z.object({
  status: z.enum(['OPEN', 'RESOLVED']).optional(),
  scope: z.enum(['PAYMENT', 'PAYOUT', 'REFUND']).optional(),
});

export const reconciliationItemParamsSchema = z.object({
  itemId: z.string().trim().min(1),
});

export const resolveReconciliationItemSchema = z.object({
  resolutionNote: z.string().trim().min(3).max(500),
});

export type RunReconciliationDto = z.infer<typeof runReconciliationSchema>;
