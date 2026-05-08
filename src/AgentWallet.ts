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

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface SpendingPolicy {
  maxTxAmount?: number;    // max per single transaction (in ETH/USDC)
  dailyLimit?: number;     // max total spend per day (in ETH/USDC)
  allowedAddresses?: Address[]; // whitelist of recipients (empty = allow all)
  requireLogAbove?: number; // log a warning if tx exceeds this amount
}

export interface PayOptions {
  to: Address;
  amount: number;          // in ETH or tokens
  token?: "ETH" | "USDC";  // default is ETH
  memo?: string;           // optional label for this payment
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
  agentId?: string;        // optional human-readable name for this agent
  policy?: SpendingPolicy;
  rpcUrl?: string;
  storage?: StorageProvider; // optional storage provider (defaults to FileStorage)
  useSmartAccount?: boolean; // enable ERC-7579 Smart Account
  bundlerUrl?: string;      // optional bundler URL for Smart Account
}

// ─────────────────────────────────────────────
// POLICY BUILDER — fluent API
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
// AGENT WALLET — main class
// ─────────────────────────────────────────────

export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base Mainnet USDC

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

import { createSmartAccountClient } from "permissionless";
import { toSafeSmartAccount } from "permissionless/accounts";

export class AgentWallet {
  private walletClient: any;
  private smartAccountClient: any;
  private publicClient: any;
  private policy: SpendingPolicy;
  private txHistory: TxRecord[] = [];
  private dailySpent: bigint = 0n;
  private dailySpentUSDC: bigint = 0n;
  private dayStart: Date = new Date();
  private storage: StorageProvider;
  public address: Address;
  public agentId: string;

  private config: WalletConfig;

  constructor(config: WalletConfig) {
    this.config = config;
    const account = privateKeyToAccount(config.privateKey);
    this.address = account.address; // Initial EOA address, will be updated if smart account is used
    this.agentId = config.agentId ?? "agent-" + account.address.slice(0, 6);
    this.policy = config.policy ?? {};
    this.storage = config.storage ?? new FileStorage();

    const chain = config.rpcUrl?.includes("mainnet") ? base : baseSepolia;
    const defaultRpc = chain.id === 8453 ? "https://mainnet.base.org" : "https://sepolia.base.org";
    const rpcUrl = config.rpcUrl ?? defaultRpc;

    this.walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl),
    });

    this.publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
  }

  // ── Initialization ──
  async init(): Promise<void> {
    await this.loadState();

    if (this.config.useSmartAccount) {
      const account = privateKeyToAccount(this.config.privateKey);
      const chain = this.config.rpcUrl?.includes("mainnet") ? base : baseSepolia;

      const safeAccount = await toSafeSmartAccount({
        client: this.publicClient,
        signer: account,
        safeVersion: "1.4.1",
        entryPointDefinition: {
            address: "0x0000000071727De22E5E9d8BAf0edAc6f37da032", // EntryPoint v0.7
            version: "0.7",
        }
      } as any);

      this.smartAccountClient = createSmartAccountClient({
        account: safeAccount,
        chain,
        bundlerTransport: http(this.config.bundlerUrl ?? (chain.id === 8453 ? "https://api.pimlico.io/v2/base/rpc?apikey=YOUR_API_KEY" : "https://api.pimlico.io/v2/base-sepolia/rpc?apikey=YOUR_API_KEY")),
      } as any);

      this.address = safeAccount.address;
      console.log(`[AgentPay] Smart Account initialized at ${this.address}`);
    }
  }

  // ── Persistence Helpers ──
  private async loadState(): Promise<void> {
    try {
      const state = await this.storage.load(this.agentId);
      if (state) {
        this.dailySpent = state.dailySpent ? BigInt(state.dailySpent) : 0n;
        this.dailySpentUSDC = state.dailySpentUSDC ? BigInt(state.dailySpentUSDC) : 0n;
        this.dayStart = state.dayStart ? new Date(state.dayStart) : new Date();
        this.txHistory = (state.txHistory || []).map((tx: any) => ({
          ...tx,
          timestamp: new Date(tx.timestamp),
        }));
      }
    } catch (err) {
      console.warn("[AgentPay] Could not load state, starting fresh:", err);
    }
  }

  private async saveState(): Promise<void> {
    try {
      const state = {
        dailySpent: this.dailySpent.toString(),
        dailySpentUSDC: this.dailySpentUSDC.toString(),
        dayStart: this.dayStart.toISOString(),
        txHistory: this.txHistory,
      };
      await this.storage.save(this.agentId, state);
    } catch (err) {
      console.error("[AgentPay] Failed to save state:", err);
    }
  }

  // ── Check spending policy before every payment ──
  private async checkPolicy(to: Address, amount: bigint, token: "ETH" | "USDC" = "ETH"): Promise<void> {
    // Reset daily counter if new day
    const now = new Date();
    const hoursSinceDayStart =
      (now.getTime() - this.dayStart.getTime()) / (1000 * 60 * 60);
    if (hoursSinceDayStart >= 24) {
      this.dailySpent = 0n;
      this.dailySpentUSDC = 0n;
      this.dayStart = now;
      await this.saveState();
    }

    const decimals = token === "USDC" ? 6 : 18;
    const spentToday = token === "USDC" ? this.dailySpentUSDC : this.dailySpent;

    // Max per transaction
    if (this.policy.maxTxAmount !== undefined) {
      const maxInBaseUnits = token === "USDC"
        ? BigInt(Math.floor(this.policy.maxTxAmount * 1_000_000))
        : parseEther(this.policy.maxTxAmount.toFixed(18));

      if (amount > maxInBaseUnits) {
        throw new Error(
          `[AgentPay] Policy violation: tx amount ${amount} ${token} exceeds maxTxAmount ${this.policy.maxTxAmount} ${token}`
        );
      }
    }

    // Daily limit
    if (this.policy.dailyLimit !== undefined) {
      const limitInBaseUnits = token === "USDC"
        ? BigInt(Math.floor(this.policy.dailyLimit * 1_000_000))
        : parseEther(this.policy.dailyLimit.toFixed(18));

      if (spentToday + amount > limitInBaseUnits) {
        throw new Error(
          `[AgentPay] Policy violation: daily limit of ${this.policy.dailyLimit} ${token} would be exceeded. Spent today: ${spentToday} ${token}`
        );
      }
    }

    // Allowlist check
    if (
      this.policy.allowedAddresses &&
      this.policy.allowedAddresses.length > 0 &&
      !this.policy.allowedAddresses
        .map((a) => a.toLowerCase())
        .includes(to.toLowerCase() as Address)
    ) {
      throw new Error(
        `[AgentPay] Policy violation: address ${to} is not in the allowed list`
      );
    }

    // Warn above threshold
    if (this.policy.requireLogAbove !== undefined) {
      const warnInBaseUnits = token === "USDC"
        ? BigInt(Math.floor(this.policy.requireLogAbove * 1_000_000))
        : parseEther(this.policy.requireLogAbove.toFixed(18));

      if (amount > warnInBaseUnits) {
        console.warn(
          `[AgentPay] ⚠️  Large payment warning: ${amount} ${token} to ${to}`
        );
      }
    }
  }

  // ── Send a payment ──
  async pay(opts: PayOptions): Promise<TxRecord> {
    const { to, amount, token = "ETH", memo } = opts;
    const amountInBaseUnits = token === "USDC"
      ? BigInt(Math.floor(amount * 1_000_000))
      : parseEther(amount.toFixed(18));

    // Enforce policy
    await this.checkPolicy(to, amountInBaseUnits, token);

    console.log(
      `[AgentPay] ${this.agentId} paying ${amount} ${token} to ${to}${memo ? ` (${memo})` : ""
      }...`
    );

    let hash: Hash;
    let status: "success" | "failed" = "success";

    try {
      if (this.config.useSmartAccount) {
        // Smart Account Transaction
        if (token === "ETH") {
            hash = await this.smartAccountClient.sendTransaction({
                to,
                value: amountInBaseUnits,
            });
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
        // Standard EOA Transaction
        if (token === "ETH") {
          hash = await this.walletClient.sendTransaction({
            to,
            value: amountInBaseUnits,
          });
        } else {
          // USDC Transfer
          const { request } = await this.publicClient.simulateContract({
            account: this.walletClient.account,
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [to, amountInBaseUnits],
          });
          hash = await this.walletClient.writeContract(request);
        }
      }

      // Wait for confirmation
      await this.publicClient.waitForTransactionReceipt({ hash });

      // Update daily spend tracker
      if (token === "ETH") {
        this.dailySpent += amountInBaseUnits;
      } else {
        this.dailySpentUSDC += amountInBaseUnits;
      }

      // Persist state
      await this.saveState();

      console.log(`[AgentPay] ✅ Payment sent!`);
      console.log(
        `[AgentPay] 🔗 https://sepolia.basescan.org/tx/${hash}`
      );
    } catch (err) {
      status = "failed";
      hash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      console.error(`[AgentPay] ❌ Payment failed:`, err);
      throw err;
    }

    const record: TxRecord = {
      hash,
      to,
      amount,
      memo,
      timestamp: new Date(),
      status,
    };

    this.txHistory.push(record);
    return record;
  }

  // ── Get wallet balance ──
  async balance(token: "ETH" | "USDC" = "ETH"): Promise<string> {
    if (token === "ETH") {
      const raw = await this.publicClient.getBalance({
        address: this.address,
      });
      return formatEther(raw);
    } else {
      const raw = await this.publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [this.address],
      });
      return (Number(raw) / 1_000_000).toString();
    }
  }

  // ── Get transaction history ──
  history(): TxRecord[] {
    return this.txHistory;
  }

  // ── Get daily spend so far ──
  dailySpentSoFar(token: "ETH" | "USDC" = "ETH"): string {
    return token === "ETH"
        ? formatEther(this.dailySpent)
        : (Number(this.dailySpentUSDC) / 1_000_000).toString();
  }

  // ── Print a summary ──
  async summary(): Promise<void> {
    const bal = await this.balance("ETH");
    let balUSDC = "0.00";
    try {
        balUSDC = await this.balance("USDC");
    } catch (e) {
        // Fallback if contract doesn't exist on current chain (e.g. local)
    }
    const spentStr = formatEther(this.dailySpent);
    const spentStrUSDC = (Number(this.dailySpentUSDC) / 1_000_000).toString();

    console.log(`\n[AgentPay] ── ${this.agentId} Summary ──`);
    console.log(`  Address:      ${this.address}`);
    console.log(`  Balance:      ${bal} ETH | ${balUSDC} USDC`);
    console.log(`  Spent today:  ${spentStr} ETH | ${spentStrUSDC} USDC`);
    console.log(`  Transactions: ${this.txHistory.length}`);
    if (this.policy.dailyLimit) {
      console.log(`  Daily limit:  ${this.policy.dailyLimit} (Policy enforced on ${this.policy.maxTxAmount ? 'ETH/USDC' : 'ETH'})`);
    }
    console.log("");
  }
}
