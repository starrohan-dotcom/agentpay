import { AgentWallet } from "../AgentWallet.js";

/**
 * AgentPay CrewAI Tool Generator
 *
 * CrewAI (JS/TS) is highly compatible with LangChain tools.
 * This helper provides a tool that conforms to the interface expected by CrewAI agents.
 */

export function createCrewAIPayTool(wallet: AgentWallet) {
  return {
    name: "agent_wallet",
    description:
      'Use this tool to pay for external services or check your own crypto balance on Base. Input should be a JSON string: { "action": "pay" | "balance", "to": "0x...", "amount": 0.001, "token": "ETH" | "USDC" }',
    func: async (input: string) => {
      try {
        const { action, to, amount, token = "ETH" } = JSON.parse(input);

        if (action === "balance") {
          const bal = await wallet.balance(token);
          return `Current balance is ${bal} ${token}`;
        }

        if (action === "pay") {
          const tx = await wallet.pay({ to, amount, token });
          return `Successfully paid ${amount} ${token} to ${to}. Tx: ${tx.hash}`;
        }

        return "Invalid action. Use 'pay' or 'balance'.";
      } catch (err: any) {
        return `[AgentPay] Error: ${err.message}`;
      }
    },
  };
}
