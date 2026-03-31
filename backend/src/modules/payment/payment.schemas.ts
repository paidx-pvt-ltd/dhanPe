import { z } from 'zod';

const bankAccountSchema = z.object({
  accountHolderName: z.string().trim().min(2).max(120),
  accountNumber: z.string().trim().min(6).max(34),
  ifsc: z.string().trim().min(4).max(20),
  bankName: z.string().trim().min(2).max(120).optional(),
});

export const createTransferSchema = z.object({
  amount: z.number().positive().max(1000000),
  description: z.string().trim().max(255).optional(),
  bankAccount: bankAccountSchema,
});

export type CreateTransferDto = z.infer<typeof createTransferSchema>;
export type BankAccountDto = z.infer<typeof bankAccountSchema>;
