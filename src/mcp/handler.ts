import { AgentWallet } from "../AgentWallet.js";
import {
    assertPaymentsEnabled,
    assertRecipientAllowed,
    getMcpTools,
    type PaymentSafetyConfig,
    parsePaymentArgs,
    parseToken,
} from "./safety.js";
import { rateLimiters } from "../utils/rate-limiter.js";
import { AgentPayError, ErrorCode } from "../utils/errors.js";

/**
 * Shared MCP tool handler logic.
 * Used by both stdio server and SSE web server to avoid duplication.
 */
export class McpToolHandler {
    constructor(
        private wallet: AgentWallet,
        private paymentSafety: PaymentSafetyConfig,
    ) { }

    /**
     * Returns the list of available tools based on safety config.
     */
    getTools() {
        return getMcpTools(this.paymentSafety);
    }

    /**
     * Handles a tool call request.
     */
    async handleToolCall(name: string, args: unknown): Promise<{
        content: Array<{ type: string; text: string }>;
        isError?: boolean;
    }> {
        // Rate limit tool calls
        if (!rateLimiters.mcpToolCalls.tryConsume()) {
            return {
                content: [
                    {
                        type: "text",
                        text: "[AgentPay Error] Rate limit exceeded. Please try again later.",
                    },
                ],
                isError: true,
            };
        }

        await this.wallet.init();

        try {
            switch (name) {
                case "check_balance": {
                    const token = parseToken((args as any)?.token);
                    const bal = await this.wallet.balance(token);
                    return {
                        content: [
                            { type: "text", text: `Current balance: ${bal} ${token}` },
                        ],
                    };
                }

                case "send_payment": {
                    assertPaymentsEnabled(this.paymentSafety);
                    const payment = parsePaymentArgs(args);
                    assertRecipientAllowed(payment.to, this.paymentSafety);

                    const tx = await this.wallet.pay(payment);
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
                    const balETH = await this.wallet.balance("ETH");
                    const balUSDC = await this.wallet.balance("USDC");
                    const spentETH = this.wallet.dailySpentSoFar("ETH");
                    const spentUSDC = this.wallet.dailySpentSoFar("USDC");

                    const summaryText = `
AgentPay Summary [${this.wallet.agentId}]
────────────────────────────────
Address: ${this.wallet.address}
Balances: ${balETH} ETH | ${balUSDC} USDC
Spent Today: ${spentETH} ETH | ${spentUSDC} USDC
Chain ID: ${this.wallet.getChainId()}
Smart Account: ${this.wallet.getIsSmartAccount() ? "Yes" : "No"}
          `.trim();

                    return {
                        content: [{ type: "text", text: summaryText }],
                    };
                }

                case "get_health": {
                    const health = await this.getHealthStatus();
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify(health, null, 2),
                            },
                        ],
                    };
                }

                default:
                    throw new AgentPayError(
                        ErrorCode.INVALID_CONFIGURATION,
                        `Unknown tool: ${name}`,
                    );
            }
        } catch (err: any) {
            return {
                content: [
                    { type: "text", text: `[AgentPay Error] ${err.message}` },
                ],
                isError: true,
            };
        }
    }

    /**
     * Returns the health status of the wallet and its dependencies.
     */
    private async getHealthStatus(): Promise<{
        status: "healthy" | "degraded" | "unhealthy";
        agentId: string;
        address: string;
        initialized: boolean;
        smartAccount: boolean;
        chainId: number;
        uptime: number;
    }> {
        return {
            status: this.wallet.getIsInitialized() ? "healthy" : "degraded",
            agentId: this.wallet.agentId,
            address: this.wallet.address,
            initialized: this.wallet.getIsInitialized(),
            smartAccount: this.wallet.getIsSmartAccount(),
            chainId: this.wallet.getChainId(),
            uptime: process.uptime(),
        };
    }
}