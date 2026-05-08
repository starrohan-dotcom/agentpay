import { Tool } from "@langchain/core/tools";
import { AgentWallet } from "../AgentWallet.js";

/**
 * AgentPay LangChain Tool
 *
 * A drop-in tool for LangChain agents to perform autonomous payments
 * and balance checks on Base.
 */
export class AgentPayTool extends Tool {
  name = "agent_wallet";
  description = `Pay for services or check your wallet balance.
    Input should be a JSON string: { "action": "pay" | "balance", "to": "0x...", "amount": 0.001, "token": "ETH" | "USDC" }`;

  constructor(private wallet: AgentWallet) {
    super();
  }

  protected async _call(input: string): Promise<string> {
    try {
      const { action, to, amount, token = "ETH" } = JSON.parse(input);

      if (action === "balance") {
        const bal = await this.wallet.balance(token);
        return `Your current balance is ${bal} ${token}`;
      }

      if (action === "pay") {
        if (!to || !amount) {
          return "Error: 'to' address and 'amount' are required for payments.";
        }
        const tx = await this.wallet.pay({ to, amount, token });
        return `Successfully paid ${amount} ${token} to ${to}. Transaction hash: ${tx.hash}`;
      }

      return "Invalid action. Use 'pay' or 'balance'.";
    } catch (err: any) {
      return `[AgentPay] Error: ${err.message}`;
    }
  }
}
