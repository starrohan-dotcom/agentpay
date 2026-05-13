import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { AgentWallet } from "../AgentWallet.js";
import { getPaymentSafetyConfig } from "./safety.js";
import { McpToolHandler } from "./handler.js";
import { rateLimiters } from "../utils/rate-limiter.js";
import { getMetricsAsText } from "../utils/metrics.js";
import { rpcCircuitBreaker } from "../utils/circuit-breaker.js";
import { transactionQueue } from "../utils/transaction-queue.js";
import { auditLogger } from "../utils/audit.js";
import express, { type Request, type Response } from "express";
import "dotenv/config";

/**
 * AgentPay Cloud MCP Server (SSE)
 *
 * This server allows MCP clients to connect via HTTP/SSE.
 * Perfect for hosting on Railway, Vercel, or Heroku.
 *
 * Production features:
 * - Bearer token authentication
 * - Rate limiting on SSE connections and tool calls
 * - Prometheus metrics endpoint (/metrics)
 * - Health check endpoint (/health)
 * - Audit log endpoint (/audit)
 * - Graceful shutdown handling
 * - Shared handler logic (no duplication with stdio server)
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
const handler = new McpToolHandler(wallet, paymentSafety);
const mcpAuthToken = process.env.AGENTPAY_MCP_AUTH_TOKEN;

// ── Authentication ──

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

// ── MCP Server Factory ──

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

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: handler.getTools(),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return handler.handleToolCall(name, args);
  });

  return server;
}

// ── SSE Transport Management ──

const transports = new Map<string, SSEServerTransport>();

// ── Routes ──

/** Root endpoint */
app.get("/", (_req, res) => {
  res.status(200).json({
    service: "AgentPay Cloud MCP Server",
    version: "1.4.0",
    status: "running",
    docs: "https://github.com/starrohan-dotcom/agentpay",
  });
});

/** Health check endpoint */
app.get("/health", async (_req, res) => {
  try {
    const circuitState = rpcCircuitBreaker.getState();
    const queueStats = transactionQueue.getStats();

    res.status(200).json({
      status: circuitState === "OPEN" ? "degraded" : "healthy",
      uptime: process.uptime(),
      walletInitialized: wallet.getIsInitialized(),
      smartAccount: wallet.getIsSmartAccount(),
      chainId: wallet.getChainId(),
      circuitBreakerState: circuitState,
      pendingTransactions: queueStats.pending,
      processingTransactions: queueStats.processing,
      completedTransactions: queueStats.completed,
      failedTransactions: queueStats.failed,
      auditEntries: auditLogger.getEntryCount(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: "unhealthy",
      error: err.message,
    });
  }
});

/** Prometheus metrics endpoint */
app.get("/metrics", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(getMetricsAsText());
});

/** Audit log endpoint (protected) */
app.get("/audit", (req, res) => {
  if (!requireMcpAuth(req, res)) return;

  const limit = parseInt((req.query.limit as string) ?? "100", 10);
  const entries = auditLogger.getRecentEntries(Math.min(limit, 1000));
  res.status(200).json(entries);
});

/** SSE connection endpoint */
app.get("/sse", async (req, res) => {
  if (!requireMcpAuth(req, res)) return;

  // Rate limit SSE connections
  if (!rateLimiters.sseConnections.tryConsume()) {
    res.status(429).json({
      error: "Too many SSE connections. Please try again later.",
    });
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

/** SSE message endpoint */
app.post("/message", async (req, res) => {
  if (!requireMcpAuth(req, res)) return;

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

// ── Graceful Shutdown ──

let server: any;

async function shutdown(signal: string) {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close();
  }

  // Wait for in-flight transactions to complete
  await transactionQueue.shutdown(30000);

  console.log("Graceful shutdown complete.");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ── Start Server ──

server = app.listen(port, () => {
  console.log(`AgentPay Cloud MCP Server listening at http://localhost:${port}`);
  console.log(`SSE endpoint:    http://localhost:${port}/sse`);
  console.log(`Message endpoint: http://localhost:${port}/message`);
  console.log(`Health check:    http://localhost:${port}/health`);
  console.log(`Metrics:         http://localhost:${port}/metrics`);
  console.log(`Audit log:       http://localhost:${port}/audit`);
});
