import { z } from 'zod';

export const cashfreeWebhookSchema = z.object({
  type: z.string().optional(),
  event_time: z.string().optional(),
  order_id: z.string(),
  order_amount: z.union([z.string(), z.number()]),
  order_status: z.string().optional(),
  payment_status: z.string().optional(),
  cf_payment_id: z.string().optional(),
});

export type CashfreeWebhookDto = z.infer<typeof cashfreeWebhookSchema>;
