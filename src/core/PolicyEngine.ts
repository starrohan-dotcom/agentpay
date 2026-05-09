import { parseEther, type Address } from "viem";
import { type SpendingPolicy } from "../AgentWallet.js";
import { AgentPayError, ErrorCode } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

/**
 * PolicyEngine handles the validation of transactions against spending rules.
 */
export class PolicyEngine {
  constructor(private policy: SpendingPolicy) {}

  /**
   * Validates a transaction against the current spending policy.
   *
   * @throws {AgentPayError} if any policy rule is violated.
   *
   * @param to The recipient's wallet address.
   * @param amount The transaction amount in base units (Wei or base USDC).
   * @param token The token being sent ("ETH" or "USDC").
   * @param dailySpentETH The total ETH spent by this agent today in Wei.
   * @param dailySpentUSDC The total USDC spent by this agent today in base units.
   */
  public validate(
    to: Address,
    amount: bigint,
    token: "ETH" | "USDC",
    dailySpentETH: bigint,
    dailySpentUSDC: bigint,
  ): void {
    const spentToday = token === "USDC" ? dailySpentUSDC : dailySpentETH;

    // Max per transaction
    if (this.policy.maxTxAmount !== undefined) {
      const maxInBaseUnits =
        token === "USDC"
          ? BigInt(Math.floor(this.policy.maxTxAmount * 1_000_000))
          : parseEther(this.policy.maxTxAmount.toFixed(18));

      if (amount > maxInBaseUnits) {
        throw new AgentPayError(
          ErrorCode.POLICY_VIOLATION,
          `Transaction amount ${amount} ${token} exceeds maxTxAmount ${this.policy.maxTxAmount}`,
        );
      }
    }

    // Daily limit
    if (this.policy.dailyLimit !== undefined) {
      const limitInBaseUnits =
        token === "USDC"
          ? BigInt(Math.floor(this.policy.dailyLimit * 1_000_000))
          : parseEther(this.policy.dailyLimit.toFixed(18));

      if (spentToday + amount > limitInBaseUnits) {
        throw new AgentPayError(
          ErrorCode.POLICY_VIOLATION,
          `Daily limit of ${this.policy.dailyLimit} ${token} would be exceeded.`,
        );
      }
    }

    // Allowlist check
    if (
      this.policy.allowedAddresses &&
      this.policy.allowedAddresses.length > 0 &&
      !this.policy.allowedAddresses.map((a) => a.toLowerCase()).includes(to.toLowerCase())
    ) {
      throw new AgentPayError(
        ErrorCode.POLICY_VIOLATION,
        `Address ${to} is not in the allowed list`,
      );
    }

    // Warn above threshold
    if (this.policy.requireLogAbove !== undefined) {
      const warnInBaseUnits =
        token === "USDC"
          ? BigInt(Math.floor(this.policy.requireLogAbove * 1_000_000))
          : parseEther(this.policy.requireLogAbove.toFixed(18));

      if (amount > warnInBaseUnits) {
        logger.warn(`Large payment warning: ${amount} ${token} to ${to}`);
      }
    }
  }
}
