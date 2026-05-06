import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  formatEther,
  type Hash,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface SpendingPolicy {
  maxTxAmount?: number;    // max per single transaction (in ETH)
  dailyLimit?: number;     // max total spend per day (in ETH)
  allowedAddresses?: Address[]; // whitelist of recipients (empty = allow all)
  requireLogAbove?: number; // log a warning if tx exceeds this amount
}

export interface PayOptions {
  to: Address;
  amount: number;          // in ETH
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

export class AgentWallet {
  private walletClient: any;
  private publicClient: any;
  private policy: SpendingPolicy;
  private txHistory: TxRecord[] = [];
  private dailySpent: number = 0;
  private dayStart: Date = new Date();
  public address: Address;
  public agentId: string;

  constructor(config: WalletConfig) {
    const account = privateKeyToAccount(config.privateKey);
    this.address = account.address;
    this.agentId = config.agentId ?? "agent-" + account.address.slice(0, 6);
    this.policy = config.policy ?? {};

    this.walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(config.rpcUrl ?? "https://sepolia.base.org"),
    });

    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(config.rpcUrl ?? "https://sepolia.base.org"),
    });
  }

  // ── Check spending policy before every payment ──
  private checkPolicy(to: Address, amount: number): void {
    // Reset daily counter if new day
    const now = new Date();
    const hoursSinceDayStart =
      (now.getTime() - this.dayStart.getTime()) / (1000 * 60 * 60);
    if (hoursSinceDayStart >= 24) {
      this.dailySpent = 0;
      this.dayStart = now;
    }

    // Max per transaction
    if (
      this.policy.maxTxAmount !== undefined &&
      amount > this.policy.maxTxAmount
    ) {
      throw new Error(
        `[AgentPay] Policy violation: tx amount ${amount} ETH exceeds maxTxAmount ${this.policy.maxTxAmount} ETH`
      );
    }

    // Daily limit
    if (
      this.policy.dailyLimit !== undefined &&
      this.dailySpent + amount > this.policy.dailyLimit
    ) {
      throw new Error(
        `[AgentPay] Policy violation: daily limit of ${this.policy.dailyLimit} ETH would be exceeded. Spent today: ${this.dailySpent} ETH`
      );
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
    if (
      this.policy.requireLogAbove !== undefined &&
      amount > this.policy.requireLogAbove
    ) {
      console.warn(
        `[AgentPay] ⚠️  Large payment warning: ${amount} ETH to ${to}`
      );
    }
  }

  // ── Send a payment ──
  async pay(opts: PayOptions): Promise<TxRecord> {
    const { to, amount, memo } = opts;

    // Enforce policy
    this.checkPolicy(to, amount);

    console.log(
      `[AgentPay] ${this.agentId} paying ${amount} ETH to ${to}${memo ? ` (${memo})` : ""
      }...`
    );

    let hash: Hash;
    let status: "success" | "failed" = "success";

    try {
      hash = await this.walletClient.sendTransaction({
        to,
        value: parseEther(amount.toString()),
      });

      // Wait for confirmation
      await this.publicClient.waitForTransactionReceipt({ hash });

      // Update daily spend tracker
      this.dailySpent += amount;

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
  async balance(): Promise<string> {
    const raw = await this.publicClient.getBalance({
      address: this.address,
    });
    return formatEther(raw);
  }

  // ── Get transaction history ──
  history(): TxRecord[] {
    return this.txHistory;
  }

  // ── Get daily spend so far ──
  dailySpentSoFar(): number {
    return this.dailySpent;
  }

  // ── Print a summary ──
  async summary(): Promise<void> {
    const bal = await this.balance();
    console.log(`\n[AgentPay] ── ${this.agentId} Summary ──`);
    console.log(`  Address:      ${this.address}`);
    console.log(`  Balance:      ${bal} ETH`);
    console.log(`  Spent today:  ${this.dailySpent} ETH`);
    console.log(`  Transactions: ${this.txHistory.length}`);
    if (this.policy.dailyLimit) {
      console.log(
        `  Daily limit:  ${this.policy.dailyLimit} ETH (${(
          (this.dailySpent / this.policy.dailyLimit) *
          100
        ).toFixed(1)}% used)`
      );
    }
    console.log("");
  }
}
