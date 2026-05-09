import { z } from "zod";

export const parsedIntentSchema = z.object({
  intent: z.string(),
  tokenIn: z.string().nullable(),
  tokenOut: z.string().nullable(),
  amountUsd: z.number().nullable(),
  frequency: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  requiresConfirmation: z.boolean(),
  summary: z.string(),
  swapAmountToken: z.number().nullable().optional(),
  swapFromSymbol: z.string().nullable().optional(),
  target: z.string().nullable().optional(),
  route: z.string().nullable().optional(),
  uiAction: z.string().nullable().optional(),
  prefill: z.record(z.string(), z.string()).nullable().optional(),
});

export const parseCommandBodySchema = z.object({
  text: z.string().min(1, "Command text is required"),
  walletAddress: z.string().min(32).max(64).optional(),
});

export const safetyCheckBodySchema = z.object({
  walletAddress: z.string().min(32).max(64),
  parsedIntent: parsedIntentSchema,
});

export const simulateTradeBodySchema = z.object({
  walletAddress: z.string().min(32).max(64),
  parsedIntent: parsedIntentSchema,
  confirmedByUser: z.literal(true),
});

export const dcaPostSchema = z.object({
  walletAddress: z.string().min(32).max(64),
  tokenSymbol: z.string().min(2).max(12),
  amountUsd: z.number().positive(),
  frequency: z.enum(["daily", "weekly", "monthly"]),
  active: z.boolean().optional().default(true),
});

export const dcaPatchSchema = z.object({
  tokenSymbol: z.string().min(2).max(12).optional(),
  amountUsd: z.number().positive().optional(),
  frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  active: z.boolean().optional(),
  nextRunAt: z.string().datetime().optional().nullable(),
});

export const settingsPatchSchema = z.object({
  maxTradeUsd: z.number().positive().optional(),
  requireConfirmation: z.boolean().optional(),
  allowedTokens: z.array(z.string()).optional(),
  blockedTokens: z.array(z.string()).optional(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  simulationMode: z.boolean().optional(),
});

export const activityPostSchema = z.object({
  walletAddress: z.string().min(32).max(64),
  commandText: z.string().min(1),
  parsedIntent: parsedIntentSchema,
  safetyResult: z
    .object({
      approved: z.boolean(),
      warnings: z.array(z.string()),
      blockedReasons: z.array(z.string()),
      riskLevel: z.string(),
    })
    .nullable()
    .optional(),
  executionResult: z.record(z.string(), z.unknown()).nullable().optional(),
  status: z.string(),
  summary: z.string(),
  simulated: z.boolean().optional(),
  txSignature: z.string().nullable().optional(),
});

export type ParsedIntent = z.infer<typeof parsedIntentSchema>;
