import { z } from 'zod';

const bankAccountSchema = z.object({
  accountHolderName: z.string().trim().min(2).max(120),
  accountNumber: z.string().trim().min(6).max(34),
  ifsc: z.string().trim().min(4).max(20),
  bankName: z.string().trim().min(2).max(120).optional(),
});

export const createTransferSchema = z
  .object({
    amount: z.number().positive().max(1000000),
    description: z.string().trim().max(255).optional(),
    beneficiaryId: z.string().trim().min(1).optional(),
    bankAccount: bankAccountSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const hasBeneficiaryId = Boolean(value.beneficiaryId);
    const hasBankAccount = Boolean(value.bankAccount);

    if (hasBeneficiaryId == hasBankAccount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either beneficiaryId or bankAccount for a transfer',
        path: ['beneficiaryId'],
      });
    }
  });

export type CreateTransferDto = z.infer<typeof createTransferSchema>;
export type BankAccountDto = z.infer<typeof bankAccountSchema>;
