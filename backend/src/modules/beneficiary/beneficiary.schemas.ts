import { z } from 'zod';

export const createBeneficiarySchema = z.object({
  accountHolderName: z.string().trim().min(2).max(120),
  accountNumber: z.string().trim().min(6).max(34),
  ifsc: z.string().trim().min(4).max(20),
  bankName: z.string().trim().min(2).max(120).optional(),
  label: z.string().trim().min(2).max(120).optional(),
});

export type CreateBeneficiaryDto = z.infer<typeof createBeneficiarySchema>;
