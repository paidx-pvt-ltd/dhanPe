import { z } from 'zod';

export const cashfreeWebhookSchema = z.object({
  type: z.string().optional(),
  event_time: z.string().optional(),
  order_id: z.string(),
  order_amount: z.union([z.string(), z.number()]),
  order_status: z.string().optional(),
  payment_status: z.string().optional(),
  cf_payment_id: z.string().optional(),
  refund_id: z.string().optional(),
  cf_refund_id: z.string().optional(),
  refund_amount: z.union([z.string(), z.number()]).optional(),
  refund_status: z.string().optional(),
  refund_note: z.string().optional(),
  status_description: z.string().optional(),
});

export type CashfreeWebhookDto = z.infer<typeof cashfreeWebhookSchema>;

export const cashfreePayoutWebhookSchema = z.object({
  type: z.string(),
  event_time: z.string().optional(),
  data: z.object({
    transfer_id: z.string(),
    cf_transfer_id: z.string().optional(),
    status: z.string(),
    status_code: z.string().optional(),
    status_description: z.string().optional(),
    transfer_amount: z.number().optional(),
    transfer_service_charge: z.number().optional(),
    transfer_service_tax: z.number().optional(),
    transfer_mode: z.string().optional(),
    transfer_utr: z.string().optional(),
    added_on: z.string().optional(),
    updated_on: z.string().optional(),
    beneficiary_details: z
      .object({
        beneficiary_id: z.string().optional(),
      })
      .optional(),
  }),
});

export type CashfreePayoutWebhookDto = z.infer<typeof cashfreePayoutWebhookSchema>;
