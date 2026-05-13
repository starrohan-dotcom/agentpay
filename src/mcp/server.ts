import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { AgentWallet } from "../AgentWallet.js";
import { getPaymentSafetyConfig } from "./safety.js";
import { McpToolHandler } from "./handler.js";
import "dotenv/config";

/**
 * AgentPay MCP Server (Stdio)
 *
 * This server allows any MCP-compatible client (like Claude Desktop)
 * to give their AI autonomous payment capabilities instantly.
 *
 * Production features:
 * - Shared handler logic (no duplication with web-server)
 * - Rate limiting on tool calls
 * - Graceful error handling
 * - Structured logging
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
const handler = new McpToolHandler(wallet, paymentSafety);

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
    tools: handler.getTools(),
  };
});

// ── Handle tool calls ──
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handler.handleToolCall(name, args);
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
