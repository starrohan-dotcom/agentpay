import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { AgentWallet } from "../AgentWallet.js";
import {
  assertPaymentsEnabled,
  assertRecipientAllowed,
  getMcpTools,
  getPaymentSafetyConfig,
  parsePaymentArgs,
  parseToken,
} from "./safety.js";
import "dotenv/config";

/**
 * AgentPay MCP Server
 *
 * This server allows any MCP-compatible client (like Claude Desktop)
 * to give their AI autonomous payment capabilities instantly.
 */

const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
if (!privateKey) {
  console.error("Error: AGENT_PRIVATE_KEY environment variable is required.");
  process.exit(1);
}

const wallet = new AgentWallet({
  privateKey,
  agentId: process.env.AGENT_ID || "mcp-agent",
  rpcUrl: process.env.RPC_URL,
  useSmartAccount: process.env.USE_SMART_ACCOUNT === "true",
  bundlerUrl: process.env.BUNDLER_URL,
});
const paymentSafety = getPaymentSafetyConfig(process.env);

const server = new Server(
  {
    name: "agentpay",
    version: "1.4.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// ── List available tools ──
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: getMcpTools(paymentSafety),
  };
});

// ── Handle tool calls ──
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  await wallet.init();

  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "check_balance": {
        const token = parseToken(args?.token);
        const bal = await wallet.balance(token);
        return {
          content: [{ type: "text", text: `Current balance: ${bal} ${token}` }],
        };
      }

      case "send_payment": {
        assertPaymentsEnabled(paymentSafety);
        const payment = parsePaymentArgs(args);
        assertRecipientAllowed(payment.to, paymentSafety);

        const tx = await wallet.pay(payment);
        return {
          content: [
            {
              type: "text",
              text: `Payment sent. Amount: ${payment.amount} ${payment.token ?? "ETH"}, To: ${payment.to}. Transaction Hash: ${tx.hash}`,
            },
          ],
        };
      }

      case "get_summary": {
        const balETH = await wallet.balance("ETH");
        const balUSDC = await wallet.balance("USDC");
        const spentETH = wallet.dailySpentSoFar("ETH");
        const spentUSDC = wallet.dailySpentSoFar("USDC");

        const summaryText = `
AgentPay Summary [${wallet.agentId}]
────────────────────────────────
Address: ${wallet.address}
Balances: ${balETH} ETH | ${balUSDC} USDC
Spent Today: ${spentETH} ETH | ${spentUSDC} USDC
        `.trim();

        return {
          content: [{ type: "text", text: summaryText }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `[AgentPay Error] ${err.message}` }],
      isError: true,
    };
  }
});

// ── Start the server ──
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AgentPay MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
