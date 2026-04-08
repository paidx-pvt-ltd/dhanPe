import { z } from 'zod';

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phoneNumber: z.string().trim().min(10).max(20).optional(),
  addressLine1: z.string().trim().min(5).max(160).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  state: z.string().trim().min(2).max(80).optional(),
  postalCode: z.string().trim().min(4).max(12).optional(),
  countryCode: z.string().trim().min(2).max(4).optional(),
});

export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
