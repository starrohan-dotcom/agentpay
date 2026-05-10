import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { AgentWallet } from "../AgentWallet.js";
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

const server = new Server(
  {
    name: "agentpay",
    version: "1.3.0",
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
    tools: [
      {
        name: "check_balance",
        description: "Check the current wallet balance in ETH or USDC",
        inputSchema: {
          type: "object",
          properties: {
            token: { type: "string", enum: ["ETH", "USDC"], default: "ETH" },
          },
        },
      },
      {
        name: "send_payment",
        description: "Send a crypto payment to a specific address",
        inputSchema: {
          type: "object",
          properties: {
            to: { type: "string", description: "The recipient's wallet address" },
            amount: { type: "number", description: "The amount to send" },
            token: { type: "string", enum: ["ETH", "USDC"], default: "ETH" },
            memo: { type: "string", description: "An optional label for the payment" },
          },
          required: ["to", "amount"],
        },
      },
      {
        name: "get_summary",
        description: "Get a summary of the agent's total spending and limits",
        inputSchema: { type: "object", properties: {} },
      },
    ],
  };
});

// ── Handle tool calls ──
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  await wallet.init();

  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "check_balance": {
        const token = (args?.token as "ETH" | "USDC") || "ETH";
        const bal = await wallet.balance(token);
        return {
          content: [{ type: "text", text: `Current balance: ${bal} ${token}` }],
        };
      }

      case "send_payment": {
        const to = args?.to as `0x${string}`;
        const amount = args?.amount as number;
        const token = (args?.token as "ETH" | "USDC") || "ETH";
        const memo = args?.memo as string;

        const tx = await wallet.pay({ to, amount, token, memo });
        return {
          content: [
            {
              type: "text",
              text: `✅ Payment sent! Amount: ${amount} ${token}, To: ${to}. Transaction Hash: ${tx.hash}`,
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
