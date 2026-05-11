import { type PayOptions, PayOptionsSchema } from "../utils/validation.js";
import { AgentPayError, ErrorCode } from "../utils/errors.js";

export type McpToken = "ETH" | "USDC";

export interface PaymentSafetyConfig {
  paymentsEnabled: boolean;
  allowedRecipients: Set<string>;
}

export type PaymentSafetyEnv = Record<string, string | undefined>;

export function getPaymentSafetyConfig(env: PaymentSafetyEnv): PaymentSafetyConfig {
  const allowedRecipients = new Set(
    (env.AGENTPAY_ALLOWED_RECIPIENTS || "")
      .split(",")
      .map((address) => address.trim().toLowerCase())
      .filter(Boolean),
  );

  return {
    paymentsEnabled: env.AGENTPAY_ENABLE_PAYMENTS === "true",
    allowedRecipients,
  };
}

export function assertPaymentsEnabled(config: PaymentSafetyConfig): void {
  if (!config.paymentsEnabled) {
    throw new AgentPayError(
      ErrorCode.POLICY_VIOLATION,
      "MCP payments are disabled. Set AGENTPAY_ENABLE_PAYMENTS=true to enable send_payment.",
    );
  }
}

export function assertRecipientAllowed(to: `0x${string}`, config: PaymentSafetyConfig): void {
  if (config.allowedRecipients.size === 0) {
    return;
  }

  if (!config.allowedRecipients.has(to.toLowerCase())) {
    throw new AgentPayError(
      ErrorCode.POLICY_VIOLATION,
      `Recipient ${to} is not in AGENTPAY_ALLOWED_RECIPIENTS.`,
    );
  }
}

export function parseToken(token: unknown): McpToken {
  if (token === undefined || token === null) {
    return "ETH";
  }

  if (token === "ETH" || token === "USDC") {
    return token;
  }

  throw new AgentPayError(ErrorCode.UNSUPPORTED_TOKEN, "Invalid token. Expected ETH or USDC.");
}

export function parsePaymentArgs(args: unknown): PayOptions {
  const parsed = PayOptionsSchema.safeParse(args ?? {});

  if (!parsed.success) {
    throw new AgentPayError(
      ErrorCode.INVALID_CONFIGURATION,
      `Invalid payment arguments: ${parsed.error.issues.map((issue) => issue.message).join(", ")}`,
    );
  }

  return parsed.data as PayOptions;
}

export function getMcpTools(config: PaymentSafetyConfig) {
  const checkBalanceTool = {
    name: "check_balance",
    description: "Check the current wallet balance in ETH or USDC",
    inputSchema: {
      type: "object",
      properties: {
        token: { type: "string", enum: ["ETH", "USDC"], default: "ETH" },
      },
    },
  };
  const sendPaymentTool = {
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
  };
  const getSummaryTool = {
    name: "get_summary",
    description: "Get a summary of the agent's total spending and limits",
    inputSchema: { type: "object", properties: {} },
  };

  if (!config.paymentsEnabled) {
    return [checkBalanceTool, getSummaryTool];
  }

  return [checkBalanceTool, sendPaymentTool, getSummaryTool];
}
