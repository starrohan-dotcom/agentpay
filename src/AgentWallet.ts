import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  formatEther,
  encodeFunctionData,
  type Hash,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, base } from "viem/chains";
import { type StorageProvider } from "./storage/StorageProvider.js";
import { FileStorage } from "./storage/FileStorage.js";
import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";
import { logger } from "./utils/logger.js";
import { AgentPayError, ErrorCode } from "./utils/errors.js";
import {
  type WalletConfig,
  type PayOptions,
  type SpendingPolicy,
  WalletConfigSchema,
  PayOptionsSchema,
} from "./utils/validation.js";
import { PolicyEngine } from "./core/PolicyEngine.js";
import { retryManager } from "./utils/retry.js";
import { rpcCircuitBreaker } from "./utils/circuit-breaker.js";
import { auditLogger } from "./utils/audit.js";
import {
  paymentsTotal,
  paymentsSucceeded,
  paymentsFailed,
  policyViolations,
  activeAgents,
  paymentLatency,
} from "./utils/metrics.js";
import { transactionQueue } from "./utils/transaction-queue.js";
import { rateLimiters } from "./utils/rate-limiter.js";
import {
  type SmartAccountClient,
  type WalletOperations,
  type PublicClientOperations,
} from "./utils/types.js";
import { getTracer } from "./utils/tracing.js";
import { deadLetterQueue } from "./utils/dead-letter-queue.js";
import { createSecretsProvider } from "./utils/secrets.js";
import type { SecretsProvider } from "./utils/types.js";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type { WalletConfig, PayOptions, SpendingPolicy };

/**
 * A record of a performed transaction.
 */
export interface TxRecord {
  /** Transaction hash on the blockchain. */
  hash: Hash;
  /** Recipient address. */
  to: Address;
  /** Amount sent. */
  amount: number;
  /** Label provided for the payment. */
  memo?: string;
  /** Timestamp of the transaction. */
  timestamp: Date;
  /** Final status of the payment. */
  status: "success" | "failed";
  /** Idempotency key for deduplication. */
  idempotencyKey?: string;
}

// ─────────────────────────────────────────────
// POLICY BUILDER
// ─────────────────────────────────────────────

/**
 * Fluent API for building a SpendingPolicy.
 */
export class PolicyBuilder {
  private rules: SpendingPolicy = {};

  /** Set the maximum amount per transaction. */
  maxTx(amount: number): PolicyBuilder {
    this.rules.maxTxAmount = amount;
    return this;
  }

  /** Set the total daily spending limit. */
  dailyLimit(amount: number): PolicyBuilder {
    this.rules.dailyLimit = amount;
    return this;
  }

  /** Restrict payments to a specific list of addresses. */
  allowOnly(addresses: Address[]): PolicyBuilder {
    this.rules.allowedAddresses = addresses;
    return this;
  }

  /** Trigger a log warning for large payments. */
  warnAbove(amount: number): PolicyBuilder {
    this.rules.requireLogAbove = amount;
    return this;
  }

  /** Return the final SpendingPolicy object. */
  build(): SpendingPolicy {
    return this.rules;
  }
}

/** Utility to start building a spending policy. */
export const policy = () => new PolicyBuilder();

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

/** USDC contract address on Base mainnet */
export const USDC_ADDRESS: Address = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/** Default RPC URLs per chain */
const DEFAULT_RPC_URLS: Record<number, string> = {
  8453: "https://mainnet.base.org",
  84532: "https://sepolia.base.org",
};

/** Safe EntryPoint v0.7 address */
const SAFE_ENTRYPOINT_ADDRESS: Address =
  "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

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

// ─────────────────────────────────────────────
// IDEMPOTENCY KEY CACHE WITH TTL
// ─────────────────────────────────────────────

interface CacheEntry {
  timestamp: number;
}

/**
 * TTL-based cache for idempotency keys.
 * Prevents unbounded memory growth by evicting entries older than TTL.
 */
class IdempotencyCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttlMs: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(ttlMs: number = 24 * 60 * 60 * 1000) {
    this.ttlMs = ttlMs;
    // Periodic cleanup every 10 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 10 * 60 * 1000);
    // Allow Node.js to exit even if this interval is running
    if (this.cleanupInterval && typeof this.cleanupInterval === "object" && "unref" in this.cleanupInterval) {
      this.cleanupInterval.unref();
    }
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  add(key: string): void {
    this.cache.set(key, { timestamp: Date.now() });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      logger.debug(`Idempotency cache cleanup: removed ${removed} expired entries`);
    }
  }

  get size(): number {
    return this.cache.size;
  }

  /** Clean up the periodic cleanup interval. Call during shutdown. */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ─────────────────────────────────────────────
// AGENT WALLET (Production-Grade)
// ─────────────────────────────────────────────

/**
 * AgentWallet is the primary interface for giving AI agents autonomous
 * financial capabilities on Base.
 *
 * Production features (v1.6.0):
 * - Retry logic with exponential backoff for all RPC calls
 * - Circuit breaker to prevent cascading failures
 * - Idempotency keys with TTL-based eviction to prevent duplicate payments
 * - Audit logging for all financial operations
 * - Prometheus-compatible metrics
 * - Rate limiting on payment operations
 * - Transaction queue with graceful shutdown
 * - Distributed tracing spans
 * - Dead letter queue for permanently failed transactions
 * - Secrets provider abstraction for key management
 */
export class AgentWallet {
  private walletClient: WalletOperations;
  private smartAccountClient: SmartAccountClient | null = null;
  private publicClient: PublicClientOperations;
  private policyEngine: PolicyEngine;
  private txHistory: TxRecord[] = [];
  private dailySpentETH: bigint = 0n;
  private dailySpentUSDC: bigint = 0n;
  private dayStart: Date = new Date();
  private storage: StorageProvider;
  private isInitialized: boolean = false;
  private processedIdempotencyKeys: IdempotencyCache;
  private secretsProvider: SecretsProvider;

  /** The public wallet address of the agent. */
  public address: Address;
  /** The unique identifier for this agent. */
  public agentId: string;
  private config: WalletConfig;

  constructor(config: WalletConfig) {
    const validated = WalletConfigSchema.parse(config);
    this.config = validated as WalletConfig;

    const account = privateKeyToAccount(this.config.privateKey as `0x${string}`);
    this.address = account.address;
    this.agentId =
      this.config.agentId ??
      "agent-" + account.address.slice(0, 6).toLowerCase();
    this.storage =
      (this.config.storage as StorageProvider) ?? new FileStorage();
    this.policyEngine = new PolicyEngine(this.config.policy ?? {});
    this.processedIdempotencyKeys = new IdempotencyCache();
    this.secretsProvider = createSecretsProvider();

    const chain = this.detectChain();
    const rpcUrl = this.config.rpcUrl ?? DEFAULT_RPC_URLS[chain.id] ?? "https://sepolia.base.org";

    this.walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    }) as WalletOperations;

    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    }) as PublicClientOperations;

    activeAgents.inc();
    logger.info("AgentWallet constructed", {
      agentId: this.agentId,
      address: this.address,
      chainId: chain.id,
    });
  }

  /**
   * Detects the chain based on RPC URL or defaults to Base Sepolia.
   */
  private detectChain() {
    if (this.config.rpcUrl?.includes("mainnet") || this.config.rpcUrl?.includes("base.org")) {
      return base;
    }
    return baseSepolia;
  }

  /**
   * Initializes the wallet, loads persistent state, and sets up
   * Smart Account clients if enabled.
   *
   * @async
   * @returns {Promise<void>}
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    const span = getTracer().startSpan("AgentWallet.init", {
      agentId: this.agentId,
    });

    try {
      await this.loadState();

      if (this.config.useSmartAccount) {
        await this.initializeSmartAccount();
      }

      this.isInitialized = true;
      logger.info("AgentWallet initialized", {
        agentId: this.agentId,
        address: this.address,
        smartAccount: !!this.smartAccountClient,
      });
      span.end();
    } catch (err: any) {
      span.endWithError(err);
      throw err;
    }
  }

  /**
   * Initializes a Safe Smart Account for on-chain policy enforcement.
   */
  private async initializeSmartAccount(): Promise<void> {
    const account = privateKeyToAccount(this.config.privateKey as `0x${string}`);
    const chain = this.detectChain();

    if (!this.config.bundlerUrl) {
      throw new AgentPayError(
        ErrorCode.INITIALIZATION_REQUIRED,
        "bundlerUrl is required when useSmartAccount is true.",
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const safeAccount = await (toSafeSmartAccount as any)({
      client: this.publicClient,
      signer: account,
      safeVersion: "1.4.1",
      entryPointDefinition: {
        address: SAFE_ENTRYPOINT_ADDRESS,
        version: "0.7",
      },
    });

    this.smartAccountClient = createSmartAccountClient({
      account: safeAccount,
      chain,
      bundlerTransport: http(this.config.bundlerUrl),
    }) as unknown as SmartAccountClient;

    this.address = safeAccount.address as Address;
    logger.info("Smart Account initialized", { address: this.address });
  }

  // ── State Management ──

  private async loadState(): Promise<void> {
    try {
      const state = await this.storage.load(this.agentId);
      if (state) {
        this.dailySpentETH = state.dailySpent
          ? BigInt(state.dailySpent)
          : 0n;
        this.dailySpentUSDC = state.dailySpentUSDC
          ? BigInt(state.dailySpentUSDC)
          : 0n;
        this.dayStart = state.dayStart
          ? new Date(state.dayStart)
          : new Date();
        this.txHistory = (state.txHistory || []).map((tx) => ({
          ...(tx as unknown as Record<string, unknown>),
          timestamp: new Date((tx as unknown as Record<string, unknown>).timestamp as string),
        })) as unknown as TxRecord[];
      }
    } catch (err) {
      logger.warn("Could not load state, starting fresh", { error: String(err) });
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
      logger.error("Failed to save state", { error: String(err) });
    }
  }

  private async checkDailyReset(): Promise<void> {
    const now = new Date();
    const hoursSinceDayStart =
      (now.getTime() - this.dayStart.getTime()) / (1000 * 60 * 60);
    if (hoursSinceDayStart >= 24) {
      this.dailySpentETH = 0n;
      this.dailySpentUSDC = 0n;
      this.dayStart = now;
      await this.saveState();
      auditLogger.logDailyReset(this.agentId);
      logger.info("Daily spending limits reset");
    }
  }

  // ── Payment Execution ──

  /**
   * Executes an autonomous payment in ETH or USDC.
   *
   * Production features:
   * - Idempotency key support with TTL-based eviction (prevents duplicate payments)
   * - Retry logic with exponential backoff
   * - Circuit breaker protection for RPC calls
   * - Rate limiting on payment operations
   * - Audit logging for all financial events
   * - Prometheus metrics
   * - Distributed tracing spans
   * - Dead letter queue for permanently failed transactions
   *
   * @async
   * @param {PayOptions} opts Payment destination, amount, and token.
   * @returns {Promise<TxRecord>} The transaction receipt record.
   * @throws {AgentPayError} if initialization is missing or policy is violated.
   */
  async pay(opts: PayOptions): Promise<TxRecord> {
    const traceSpan = getTracer().startSpan("AgentWallet.pay", {
      agentId: this.agentId,
      token: opts.token ?? "ETH",
    });

    try {
      if (!this.isInitialized) {
        throw new AgentPayError(
          ErrorCode.INITIALIZATION_REQUIRED,
          "Must call .init() before making payments.",
        );
      }

      // Rate limiting for payment operations
      if (!rateLimiters.payments.tryConsume()) {
        throw new AgentPayError(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          "Rate limit exceeded for payment operations. Please try again later.",
        );
      }

      const validated = PayOptionsSchema.parse(opts);
      const { to, amount, token = "ETH", memo, idempotencyKey } = validated as PayOptions;

      // Idempotency check with TTL
      if (idempotencyKey && this.processedIdempotencyKeys.has(idempotencyKey)) {
        logger.warn("Duplicate idempotency key detected, rejecting payment", {
          idempotencyKey,
        });
        throw new AgentPayError(
          ErrorCode.POLICY_VIOLATION,
          `Payment with idempotency key ${idempotencyKey} has already been processed.`,
        );
      }

      const amountInBaseUnits =
        token === "USDC"
          ? BigInt(Math.floor(amount * 1_000_000))
          : parseEther(amount.toFixed(18));

      await this.checkDailyReset();

      // Policy validation with audit logging
      try {
        this.policyEngine.validate(
          to as Address,
          amountInBaseUnits,
          token,
          this.dailySpentETH,
          this.dailySpentUSDC,
        );
        auditLogger.logPolicyCheck({
          agentId: this.agentId,
          policyResult: "PASSED",
          amount: amount.toString(),
          token,
          recipient: to as Address,
        });
      } catch (policyErr: any) {
        policyViolations.inc({ token });
        auditLogger.logPolicyCheck({
          agentId: this.agentId,
          policyResult: "FAILED",
          amount: amount.toString(),
          token,
          recipient: to as Address,
          errorMessage: policyErr.message,
        });
        traceSpan.endWithError(policyErr);
        throw policyErr;
      }

      // Track idempotency key
      if (idempotencyKey) {
        this.processedIdempotencyKeys.add(idempotencyKey);
      }

      paymentsTotal.inc({ token, status: "initiated" });
      auditLogger.logPaymentInitiated({
        agentId: this.agentId,
        amount: amount.toString(),
        token,
        recipient: to as Address,
        idempotencyKey: idempotencyKey ?? "none",
      });

      logger.info("Processing payment", {
        agentId: this.agentId,
        amount,
        token,
        to,
        idempotencyKey,
      });

      const startTime = Date.now();
      let hash: Hash;

      try {
        // Execute with retry and circuit breaker
        hash = await retryManager.execute(async () => {
          return rpcCircuitBreaker.execute(async () => {
            if (this.config.useSmartAccount && this.smartAccountClient) {
              return this.executeSmartAccountPayment(
                to as Address,
                amountInBaseUnits,
                token,
              );
            }
            return this.executeEOAPayment(
              to as Address,
              amountInBaseUnits,
              token,
            );
          });
        }, `payment-${this.agentId}`);

        // Wait for receipt with retry
        await retryManager.execute(async () => {
          return rpcCircuitBreaker.execute(async () => {
            await this.publicClient.waitForTransactionReceipt({ hash });
          });
        }, `wait-receipt-${hash}`);

        // Update daily spent
        if (token === "ETH") {
          this.dailySpentETH += amountInBaseUnits;
        } else {
          this.dailySpentUSDC += amountInBaseUnits;
        }

        await this.saveState();

        // Record latency
        const latencySeconds = (Date.now() - startTime) / 1000;
        paymentLatency.observe({ token, status: "success" }, latencySeconds);

        paymentsSucceeded.inc({ token });
        auditLogger.logPaymentSucceeded({
          agentId: this.agentId,
          transactionHash: hash,
          amount: amount.toString(),
          token,
          recipient: to as Address,
          idempotencyKey: idempotencyKey ?? "none",
        });

        logger.info("Payment successful", { hash, latencySeconds });
      } catch (err: any) {
        const latencySeconds = (Date.now() - startTime) / 1000;
        paymentLatency.observe({ token, status: "failed" }, latencySeconds);

        paymentsFailed.inc({ token });
        auditLogger.logPaymentFailed({
          agentId: this.agentId,
          amount: amount.toString(),
          token,
          recipient: to as Address,
          idempotencyKey: idempotencyKey ?? "none",
          errorMessage: err.message,
        });

        // Remove idempotency key on failure to allow retry
        if (idempotencyKey) {
          this.processedIdempotencyKeys.delete(idempotencyKey);
        }

        const failedRecord: TxRecord = {
          hash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          to: to as Address,
          amount,
          memo,
          timestamp: new Date(),
          status: "failed",
          idempotencyKey,
        };
        this.txHistory.push(failedRecord);
        logger.error("Payment failed", { error: err.message });

        traceSpan.endWithError(err);
        throw new AgentPayError(
          ErrorCode.TRANSACTION_FAILED,
          err.message,
          { originalError: err.message },
        );
      }

      const record: TxRecord = {
        hash,
        to: to as Address,
        amount,
        memo,
        timestamp: new Date(),
        status: "success",
        idempotencyKey,
      };
      this.txHistory.push(record);
      traceSpan.end();
      return record;
    } catch (err: any) {
      // Ensure span is ended on any unhandled error
      if (err instanceof AgentPayError) {
        throw err;
      }
      traceSpan.endWithError(err);
      throw new AgentPayError(
        ErrorCode.TRANSACTION_FAILED,
        err.message,
        { originalError: err.message },
      );
    }
  }

  /**
   * Executes a payment via Smart Account (ERC-4337).
   */
  private async executeSmartAccountPayment(
    to: Address,
    amountInBaseUnits: bigint,
    token: "ETH" | "USDC",
  ): Promise<Hash> {
    if (!this.smartAccountClient) {
      throw new AgentPayError(
        ErrorCode.INITIALIZATION_REQUIRED,
        "Smart account client not initialized.",
      );
    }

    if (token === "ETH") {
      return this.smartAccountClient.sendTransaction({
        to,
        value: amountInBaseUnits,
      });
    }

    return this.smartAccountClient.sendTransaction({
      to: USDC_ADDRESS,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to, amountInBaseUnits],
      }),
    });
  }

  /**
   * Executes a payment via EOA (Externally Owned Account).
   */
  private async executeEOAPayment(
    to: Address,
    amountInBaseUnits: bigint,
    token: "ETH" | "USDC",
  ): Promise<Hash> {
    if (token === "ETH") {
      return this.walletClient.sendTransaction({
        to,
        value: amountInBaseUnits,
      });
    }

    const { request } = await this.publicClient.simulateContract({
      account: { address: this.address },
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [to, amountInBaseUnits],
    });

    return this.walletClient.writeContract(request as {
      address: Address;
      abi: readonly Record<string, unknown>[];
      functionName: string;
      args: readonly unknown[];
    });
  }

  // ── Balance & History ──

  /**
   * Fetches the current balance for the agent's wallet.
   *
   * @async
   * @param {"ETH" | "USDC"} token The currency to check.
   * @returns {Promise<string>} Balance formatted as a human-readable string.
   */
  async balance(token: "ETH" | "USDC" = "ETH"): Promise<string> {
    return retryManager.execute(async () => {
      return rpcCircuitBreaker.execute(async () => {
        if (token === "ETH") {
          const raw = await this.publicClient.getBalance({
            address: this.address,
          });
          return formatEther(raw);
        }

        try {
          const raw = (await this.publicClient.readContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [this.address],
          })) as bigint;
          return (Number(raw) / 1_000_000).toString();
        } catch {
          return "0.00";
        }
      });
    }, `balance-${token}-${this.agentId}`);
  }

  /**
   * Returns the transaction history for this agent session.
   */
  history(): TxRecord[] {
    return this.txHistory;
  }

  /**
   * Returns how much has been spent today in the specified token.
   */
  dailySpentSoFar(token: "ETH" | "USDC" = "ETH"): string {
    return token === "ETH"
      ? formatEther(this.dailySpentETH)
      : (Number(this.dailySpentUSDC) / 1_000_000).toString();
  }

  /**
   * Returns the current spending policy.
   */
  getPolicy(): SpendingPolicy {
    return this.config.policy ?? {};
  }

  /**
   * Returns the chain ID the wallet is connected to.
   */
  getChainId(): number {
    return this.detectChain().id;
  }

  /**
   * Returns whether the wallet is initialized.
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Returns whether a smart account is in use.
   */
  getIsSmartAccount(): boolean {
    return !!this.smartAccountClient;
  }

  /**
   * Returns the secrets provider for health checks.
   */
  getSecretsProvider(): SecretsProvider {
    return this.secretsProvider;
  }

  // ── Summary ──

  /**
   * Logs a professional summary of the agent's financial status to the console.
   */
  async summary(): Promise<void> {
    const balETH = await this.balance("ETH");
    let balUSDC = "0.00";
    try {
      balUSDC = await this.balance("USDC");
    } catch {
      // Fallback
    }
    const spentETH = this.dailySpentSoFar("ETH");
    const spentUSDC = this.dailySpentSoFar("USDC");

    console.log(
      `\n\x1b[36m[AgentPay] ── ${this.agentId} Summary ──\x1b[0m`,
    );
    console.log(`  Address:      ${this.address}`);
    console.log(`  Balance:      ${balETH} ETH | ${balUSDC} USDC`);
    console.log(`  Spent today:  ${spentETH} ETH | ${spentUSDC} USDC`);
    console.log(`  Transactions: ${this.txHistory.length}`);
    if (this.config.policy?.dailyLimit) {
      console.log(
        `  Daily limit:  ${this.config.policy.dailyLimit} (Policy enforced)`,
      );
    }
    console.log("");
  }
}
