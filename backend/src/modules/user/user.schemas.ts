import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phoneNumber: z.string().trim().min(10).max(20).optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
