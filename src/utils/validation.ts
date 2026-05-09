import { z } from "zod";

export const SpendingPolicySchema = z.object({
  maxTxAmount: z.number().optional(),
  dailyLimit: z.number().optional(),
  allowedAddresses: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).optional(),
  requireLogAbove: z.number().optional(),
});

export const WalletConfigSchema = z.object({
  privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  agentId: z.string().optional(),
  policy: SpendingPolicySchema.optional(),
  rpcUrl: z.string().url().optional(),
  storage: z.any().optional(), // StorageProvider is verified manually
  useSmartAccount: z.boolean().optional().default(false),
  bundlerUrl: z.string().url().optional(),
});

export const PayOptionsSchema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.number().positive(),
  token: z.enum(["ETH", "USDC"]).optional().default("ETH"),
  memo: z.string().optional(),
});
