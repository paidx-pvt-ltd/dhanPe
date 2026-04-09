import { z } from 'zod';

const mobileNumberSchema = z
  .string()
  .trim()
  .regex(/^\+?\d{10,15}$/, 'Mobile number must be a valid MSISDN');

export const widgetConfigSchema = z.object({});

export const verifyOtpSchema = z.object({
  accessToken: z.string().trim().min(1),
  mobileNumber: mobileNumberSchema.optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type WidgetConfigDto = z.infer<typeof widgetConfigSchema>;
export type VerifyOtpDto = z.infer<typeof verifyOtpSchema>;
export type RefreshDto = z.infer<typeof refreshSchema>;
