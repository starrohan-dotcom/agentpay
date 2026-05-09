import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  formatEther,
  encodeFunctionData,
  type Hash,
  type Address,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, base } from "viem/chains";
import { type StorageProvider } from "./storage/StorageProvider.js";
import { FileStorage } from "./storage/FileStorage.js";
import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { logger } from "./utils/logger.js";
import { AgentPayError, ErrorCode } from "./utils/errors.js";
import { WalletConfigSchema, PayOptionsSchema } from "./utils/validation.js";
import { PolicyEngine } from "./core/PolicyEngine.js";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface SpendingPolicy {
  maxTxAmount?: number;
  dailyLimit?: number;
  allowedAddresses?: Address[];
  requireLogAbove?: number;
}

export interface PayOptions {
  to: Address;
  amount: number;
  token?: "ETH" | "USDC";
  memo?: string;
}

export interface TxRecord {
  hash: Hash;
  to: Address;
  amount: number;
  memo?: string;
  timestamp: Date;
  status: "success" | "failed";
}

export interface WalletConfig {
  privateKey: `0x${string}`;
  agentId?: string;
  policy?: SpendingPolicy;
  rpcUrl?: string;
  storage?: StorageProvider;
  useSmartAccount?: boolean;
  bundlerUrl?: string;
}

// ─────────────────────────────────────────────
// POLICY BUILDER
// ─────────────────────────────────────────────

export class PolicyBuilder {
  private rules: SpendingPolicy = {};

  maxTx(amount: number): PolicyBuilder {
    this.rules.maxTxAmount = amount;
    return this;
  }

  dailyLimit(amount: number): PolicyBuilder {
    this.rules.dailyLimit = amount;
    return this;
  }

  allowOnly(addresses: Address[]): PolicyBuilder {
    this.rules.allowedAddresses = addresses;
    return this;
  }

  warnAbove(amount: number): PolicyBuilder {
    this.rules.requireLogAbove = amount;
    return this;
  }

  build(): SpendingPolicy {
    return this.rules;
  }
}

export const policy = () => new PolicyBuilder();

// ─────────────────────────────────────────────
// AGENT WALLET
// ─────────────────────────────────────────────

export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

export class AgentWallet {
  private walletClient: WalletClient;
  private smartAccountClient: any;
  private publicClient: PublicClient;
  private policyEngine: PolicyEngine;
  private txHistory: TxRecord[] = [];
  private dailySpentETH: bigint = 0n;
  private dailySpentUSDC: bigint = 0n;
  private dayStart: Date = new Date();
  private storage: StorageProvider;
  private isInitialized: boolean = false;

  public address: Address;
  public agentId: string;
  private config: WalletConfig;

  constructor(config: WalletConfig) {
    const validated = WalletConfigSchema.parse(config);
    this.config = validated as WalletConfig;

    const account = privateKeyToAccount(this.config.privateKey);
    this.address = account.address;
    this.agentId = this.config.agentId ?? "agent-" + account.address.slice(0, 6).toLowerCase();
    this.storage = this.config.storage ?? new FileStorage();
    this.policyEngine = new PolicyEngine(this.config.policy ?? {});

    const chain = this.config.rpcUrl?.includes("mainnet") ? base : baseSepolia;
    const defaultRpc = chain.id === 8453 ? "https://mainnet.base.org" : "https://sepolia.base.org";
    const rpcUrl = this.config.rpcUrl ?? defaultRpc;

    this.walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });

    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    }) as PublicClient;
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    await this.loadState();

    if (this.config.useSmartAccount) {
      const account = privateKeyToAccount(this.config.privateKey);
      const chain = this.config.rpcUrl?.includes("mainnet") ? base : baseSepolia;

      const safeAccount = await toSafeSmartAccount({
        client: this.publicClient,
        signer: account,
        safeVersion: "1.4.1",
        entryPointDefinition: {
          address: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
          version: "0.7",
        },
      } as any);

      this.smartAccountClient = createSmartAccountClient({
        account: safeAccount,
        chain,
        bundlerTransport: http(
          this.config.bundlerUrl ??
            (chain.id === 8453
              ? "https://api.pimlico.io/v2/base/rpc?apikey=YOUR_API_KEY"
              : "https://api.pimlico.io/v2/base-sepolia/rpc?apikey=YOUR_API_KEY"),
        ),
      } as any);

      this.address = safeAccount.address;
      logger.info(`Smart Account initialized`, { address: this.address });
    }

    this.isInitialized = true;
    logger.info(`AgentWallet initialized`, { agentId: this.agentId, address: this.address });
  }

  private async loadState(): Promise<void> {
    try {
      const state = await this.storage.load(this.agentId);
      if (state) {
        this.dailySpentETH = state.dailySpent ? BigInt(state.dailySpent) : 0n;
        this.dailySpentUSDC = state.dailySpentUSDC ? BigInt(state.dailySpentUSDC) : 0n;
        this.dayStart = state.dayStart ? new Date(state.dayStart) : new Date();
        this.txHistory = (state.txHistory || []).map((tx: any) => ({
          ...tx,
          timestamp: new Date(tx.timestamp),
        }));
      }
    } catch (err) {
      logger.warn("Could not load state, starting fresh", { error: err });
    }
  }

  private async saveState(): Promise<void> {
    try {
      const state = {
        dailySpent: this.dailySpentETH.toString(),
        dailySpentUSDC: this.dailySpentUSDC.toString(),
        dayStart: this.dayStart.toISOString(),
        txHistory: this.txHistory,
      };
      await this.storage.save(this.agentId, state);
    } catch (err) {
      logger.error("Failed to save state", { error: err });
    }
  }

  private async checkDailyReset(): Promise<void> {
    const now = new Date();
    const hoursSinceDayStart = (now.getTime() - this.dayStart.getTime()) / (1000 * 60 * 60);
    if (hoursSinceDayStart >= 24) {
      this.dailySpentETH = 0n;
      this.dailySpentUSDC = 0n;
      this.dayStart = now;
      await this.saveState();
      logger.info("Daily spending limits reset");
    }
  }

  async pay(opts: PayOptions): Promise<TxRecord> {
    if (!this.isInitialized) {
      throw new AgentPayError(
        ErrorCode.INITIALIZATION_REQUIRED,
        "Must call .init() before making payments.",
      );
    }

    const validated = PayOptionsSchema.parse(opts);
    const { to, amount, token = "ETH", memo } = validated as PayOptions;

    const amountInBaseUnits =
      token === "USDC" ? BigInt(Math.floor(amount * 1_000_000)) : parseEther(amount.toFixed(18));

    await this.checkDailyReset();

    this.policyEngine.validate(
      to as Address,
      amountInBaseUnits,
      token,
      this.dailySpentETH,
      this.dailySpentUSDC,
    );

    logger.info(`Processing payment`, { agentId: this.agentId, amount, token, to });

    let hash: Hash;
    const status: "success" | "failed" = "success";

    try {
      if (this.config.useSmartAccount) {
        if (token === "ETH") {
          hash = await this.smartAccountClient.sendTransaction({ to, value: amountInBaseUnits });
        } else {
          hash = await this.smartAccountClient.sendTransaction({
            to: USDC_ADDRESS,
            data: encodeFunctionData({
              abi: ERC20_ABI,
              functionName: "transfer",
              args: [to, amountInBaseUnits],
            }),
          });
        }
      } else {
        if (token === "ETH") {
          hash = await (this.walletClient as any).sendTransaction({ to, value: amountInBaseUnits });
        } else {
          const { request } = await this.publicClient.simulateContract({
            account: this.walletClient.account,
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [to, amountInBaseUnits],
          });
          hash = await (this.walletClient as any).writeContract(request);
        }
      }

      await this.publicClient.waitForTransactionReceipt({ hash });

      if (token === "ETH") this.dailySpentETH += amountInBaseUnits;
      else this.dailySpentUSDC += amountInBaseUnits;

      await this.saveState();
      logger.info(`Payment successful`, { hash });
    } catch (err: any) {
      const failedHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const failedRecord: TxRecord = {
        hash: failedHash,
        to,
        amount,
        memo,
        timestamp: new Date(),
        status: "failed",
      };
      this.txHistory.push(failedRecord);
      logger.error(`Payment failed`, { error: err.message });
      throw new AgentPayError(ErrorCode.TRANSACTION_FAILED, err.message, err);
    }

    const record: TxRecord = { hash, to, amount, memo, timestamp: new Date(), status };
    this.txHistory.push(record);
    return record;
  }

  async balance(token: "ETH" | "USDC" = "ETH"): Promise<string> {
    if (token === "ETH") {
      const raw = await this.publicClient.getBalance({ address: this.address });
      return formatEther(raw);
    } else {
      try {
        const raw = await this.publicClient.readContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [this.address],
        });
        return (Number(raw) / 1_000_000).toString();
      } catch {
        return "0.00";
      }
    }
  }

  history(): TxRecord[] {
    return this.txHistory;
  }

  dailySpentSoFar(token: "ETH" | "USDC" = "ETH"): string {
    return token === "ETH"
      ? formatEther(this.dailySpentETH)
      : (Number(this.dailySpentUSDC) / 1_000_000).toString();
  }

  async summary(): Promise<void> {
    const balETH = await this.balance("ETH");
    const balUSDC = await this.balance("USDC");
    const spentETH = this.dailySpentSoFar("ETH");
    const spentUSDC = this.dailySpentSoFar("USDC");

    console.log(`\n\x1b[36m[AgentPay] ── ${this.agentId} Summary ──\x1b[0m`);
    console.log(`  Address:      ${this.address}`);
    console.log(`  Balance:      ${balETH} ETH | ${balUSDC} USDC`);
    console.log(`  Spent today:  ${spentETH} ETH | ${spentUSDC} USDC`);
    console.log(`  Transactions: ${this.txHistory.length}`);
    if (this.config.policy?.dailyLimit) {
      console.log(`  Daily limit:  ${this.config.policy.dailyLimit} (Policy enforced)`);
    }
    console.log("");
  }
}
