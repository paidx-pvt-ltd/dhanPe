import { DisputePhase, DisputeStatus } from '@prisma/client';
import { z } from 'zod';

const allowedCreateStatuses = [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW] as const;
const allowedResolveStatuses = [
  DisputeStatus.WON,
  DisputeStatus.LOST,
  DisputeStatus.CLOSED,
] as const;

export const createDisputeSchema = z.object({
  transactionId: z.string().trim().min(1),
  phase: z.nativeEnum(DisputePhase).optional(),
  status: z.enum(allowedCreateStatuses).optional(),
  amount: z.number().positive().max(1000000).optional(),
  currency: z.string().trim().length(3).optional(),
  providerDisputeId: z.string().trim().min(1).max(255).optional(),
  providerCaseId: z.string().trim().min(1).max(255).optional(),
  providerStatus: z.string().trim().min(1).max(255).optional(),
  reasonCode: z.string().trim().min(1).max(128).optional(),
  reasonMessage: z.string().trim().min(3).max(500).optional(),
  evidenceDueBy: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const disputeQuerySchema = z.object({
  status: z.nativeEnum(DisputeStatus).optional(),
  phase: z.nativeEnum(DisputePhase).optional(),
  transactionId: z.string().trim().min(1).optional(),
});

export const disputeParamsSchema = z.object({
  disputeId: z.string().trim().min(1),
});

export const respondDisputeSchema = z.object({
  operatorNote: z.string().trim().min(3).max(1000),
  phase: z.nativeEnum(DisputePhase).optional(),
  status: z.enum([DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW]).optional(),
  providerStatus: z.string().trim().min(1).max(255).optional(),
  evidenceDueBy: z.coerce.date().optional(),
});

export const resolveDisputeSchema = z.object({
  resolutionNote: z.string().trim().min(3).max(1000),
  outcome: z.enum(allowedResolveStatuses),
  providerStatus: z.string().trim().min(1).max(255).optional(),
});

export type CreateDisputeDto = z.infer<typeof createDisputeSchema>;
export type RespondDisputeDto = z.infer<typeof respondDisputeSchema>;
export type ResolveDisputeDto = z.infer<typeof resolveDisputeSchema>;
