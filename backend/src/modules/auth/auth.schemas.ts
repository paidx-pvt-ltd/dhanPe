import { z } from 'zod';

const mobileNumberSchema = z
  .string()
  .trim()
  .regex(/^\+?\d{10,15}$/, 'Mobile number must be a valid MSISDN');

export const sendOtpSchema = z.object({
  mobileNumber: mobileNumberSchema,
});

export const verifyOtpSchema = z.object({
  mobileNumber: mobileNumberSchema,
  otp: z.string().trim().min(4).max(9),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type SendOtpDto = z.infer<typeof sendOtpSchema>;
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
