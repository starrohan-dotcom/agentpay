import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
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
import express, { type Request, type Response } from "express";
import "dotenv/config";

/**
 * AgentPay Cloud MCP Server (SSE)
 *
 * This server allows MCP clients to connect via HTTP/SSE.
 * Perfect for hosting on Railway, Vercel, or Heroku.
 */

const app = express();
const port = process.env.PORT || 3000;

const privateKey = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
if (!privateKey) {
  console.error("Error: AGENT_PRIVATE_KEY environment variable is required.");
  process.exit(1);
}

const wallet = new AgentWallet({
  privateKey,
  agentId: process.env.AGENT_ID || "cloud-agent",
  rpcUrl: process.env.RPC_URL,
  useSmartAccount: process.env.USE_SMART_ACCOUNT === "true",
  bundlerUrl: process.env.BUNDLER_URL,
});
const paymentSafety = getPaymentSafetyConfig(process.env);
const mcpAuthToken = process.env.AGENTPAY_MCP_AUTH_TOKEN;

function isAuthorized(req: Request): boolean {
  if (!mcpAuthToken) {
    return true;
  }

  const authHeader = req.header("authorization");
  return authHeader === `Bearer ${mcpAuthToken}`;
}

function requireMcpAuth(req: Request, res: Response): boolean {
  if (isAuthorized(req)) {
    return true;
  }

  res.status(401).json({ error: "Unauthorized" });
  return false;
}

function createMcpServer(): Server {
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

  return server;
}

const transports = new Map<string, SSEServerTransport>();

app.get("/", (req, res) => {
  res.status(200).send("AgentPay Cloud MCP Server is running.");
});

app.get("/sse", async (req, res) => {
  if (!requireMcpAuth(req, res)) {
    return;
  }

  console.log("New SSE connection");
  const transport = new SSEServerTransport("/message", res);
  transports.set(transport.sessionId, transport);
  transport.onclose = () => {
    transports.delete(transport.sessionId);
  };
  await createMcpServer().connect(transport);
});

app.post("/message", async (req, res) => {
  if (!requireMcpAuth(req, res)) {
    return;
  }

  const sessionId = req.query.sessionId;
  if (typeof sessionId !== "string") {
    res.status(400).json({ error: "Missing sessionId" });
    return;
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: "Unknown sessionId" });
    return;
  }

  console.log("New message received");
  await transport.handlePostMessage(req, res);
});

app.listen(port, () => {
  console.log(`AgentPay Cloud MCP Server listening at http://localhost:${port}`);
  console.log(`SSE endpoint: http://localhost:${port}/sse`);
  console.log(`Message endpoint: http://localhost:${port}/message`);
});
