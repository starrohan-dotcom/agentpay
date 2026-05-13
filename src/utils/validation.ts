import { z } from "zod";

export const SpendingPolicySchema = z.object({
  maxTxAmount: z.number().optional(),
  dailyLimit: z.number().optional(),
  allowedAddresses: z.array(z.string().regex(/^0x[a-fA-F0-9]{40}$/)).optional(),
  requireLogAbove: z.number().optional(),
});

export type SpendingPolicy = z.infer<typeof SpendingPolicySchema>;

export const WalletConfigSchema = z.object({
  privateKey: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  agentId: z.string().optional(),
  policy: SpendingPolicySchema.optional(),
  rpcUrl: z.string().url().optional(),
  storage: z.any().optional(),
  useSmartAccount: z.boolean().optional().default(false),
  bundlerUrl: z.string().url().optional(),
});

export type WalletConfig = {
  privateKey: `0x${string}`;
  agentId?: string;
  policy?: SpendingPolicy;
  rpcUrl?: string;
  storage?: any;
  useSmartAccount?: boolean;
  bundlerUrl?: string;
};

export const PayOptionsSchema = z.object({
  to: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.number().positive(),
  token: z.enum(["ETH", "USDC"]).optional().default("ETH"),
  memo: z.string().optional(),
  idempotencyKey: z.string().uuid().optional(),
});

export type PayOptions = {
  to: `0x${string}`;
  amount: number;
  token?: "ETH" | "USDC";
  memo?: string;
  idempotencyKey?: string;
};

export const HealthStatusSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  uptime: z.number(),
  rpcConnected: z.boolean(),
  walletInitialized: z.boolean(),
  chainId: z.number().optional(),
  lastBlockNumber: z.bigint().optional(),
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;
