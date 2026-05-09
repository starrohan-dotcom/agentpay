/**
 * LangChain Integration Example
 *
 * Wrap AgentPay into a LangChain Tool so your LLM-based agent
 * can autonomously decide when to check its balance or make a payment.
 */

import "dotenv/config";
import { AgentWallet } from "@starrohan/agentpay";
import { DynamicTool } from "@langchain/core/tools";

export async function getAgentPayTool(privateKey: `0x${string}`) {
  const agent = new AgentWallet({ privateKey });
  await agent.init();

  return new DynamicTool({
    name: "agent_wallet",
    description:
      'Use this tool to pay for external services or check your own crypto balance. Input should be a JSON string like: { "action": "pay", "to": "0x...", "amount": 0.001, "token": "ETH"| "USDC" }',
    func: async (input: string) => {
      try {
        const { action, to, amount, token } = JSON.parse(input);

        if (action === "balance") {
          const bal = await agent.balance(token || "ETH");
          return `My current balance is ${bal} ${token || "ETH"}`;
        }

        if (action === "pay") {
          const tx = await agent.pay({ to, amount, token: token || "ETH" });
          return `Successfully paid ${amount} ${token || "ETH"} to ${to}. Transaction hash: ${tx.hash}`;
        }

        return "Invalid action. Use 'pay' or 'balance'.";
      } catch (err: any) {
        return `Error using wallet: ${err.message}`;
      }
    },
  });
}

console.log("Tool created. Ready to be added to LangChain agents!");
