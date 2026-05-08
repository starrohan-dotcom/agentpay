import { AgentWallet } from "../AgentWallet.js";

/**
 * AgentPay AutoGen Integration
 *
 * AutoGen (JS/TS) typically registers tools as functions.
 * This helper returns the tool definition and implementation for AutoGen.
 */

export function getAutoGenPayTool(wallet: AgentWallet) {
  return {
    schema: {
      name: "agent_wallet",
      description: "Pay for services or check crypto balance on Base.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["pay", "balance"] },
          to: { type: "string", description: "Recipient address" },
          amount: { type: "number", description: "Amount in ETH or USDC" },
          token: { type: "string", enum: ["ETH", "USDC"], default: "ETH" }
        },
        required: ["action"]
      }
    },
    implementation: async ({ action, to, amount, token = "ETH" }: any) => {
      try {
        if (action === "balance") {
          const bal = await wallet.balance(token);
          return `Current balance: ${bal} ${token}`;
        }

        if (action === "pay") {
          const tx = await wallet.pay({ to, amount, token });
          return `Payment successful. Hash: ${tx.hash}`;
        }

        return "Error: Invalid action.";
      } catch (err: any) {
        return `[AgentPay] Error: ${err.message}`;
      }
    }
  };
}
