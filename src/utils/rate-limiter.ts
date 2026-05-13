import { logger } from "./logger.js";

/**
 * Production-grade token bucket rate limiter.
 *
 * Used to protect MCP endpoints and RPC calls from abuse.
 * Implements the token bucket algorithm for smooth rate limiting.
 */
export class RateLimiter {
    private tokens: number;
    private maxTokens: number;
    private refillRate: number; // tokens per second
    private lastRefill: number;
    private name: string;

    constructor(
        name: string,
        options: {
            maxTokens?: number;
            refillRate?: number; // tokens per second
        } = {},
    ) {
        this.name = name;
        this.maxTokens = options.maxTokens ?? 100;
        this.tokens = this.maxTokens;
        this.refillRate = options.refillRate ?? 10; // 10 tokens/sec default
        this.lastRefill = Date.now();
    }

    /**
     * Attempts to consume a token. Returns true if allowed, false if rate limited.
     */
    tryConsume(tokens: number = 1): boolean {
        this.refill();

        if (this.tokens >= tokens) {
            this.tokens -= tokens;
            return true;
        }

        logger.warn(`Rate limit exceeded for ${this.name}`, {
            available: this.tokens,
            requested: tokens,
            maxTokens: this.maxTokens,
        });

        return false;
    }

    /**
     * Returns the current number of available tokens.
     */
    availableTokens(): number {
        this.refill();
        return this.tokens;
    }

    /**
     * Refills tokens based on elapsed time.
     */
    private refill(): void {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000; // seconds
        const newTokens = elapsed * this.refillRate;

        this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
        this.lastRefill = now;
    }

    /**
     * Resets the rate limiter to full capacity.
     */
    reset(): void {
        this.tokens = this.maxTokens;
        this.lastRefill = Date.now();
    }
}

/**
 * Pre-configured rate limiters for different endpoints.
 */
export const rateLimiters = {
    /** MCP SSE connections: 10 new connections per second */
    sseConnections: new RateLimiter("sse-connections", {
        maxTokens: 10,
        refillRate: 2,
    }),

    /** MCP tool calls: 50 requests per second */
    mcpToolCalls: new RateLimiter("mcp-tool-calls", {
        maxTokens: 50,
        refillRate: 10,
    }),

    /** Payment operations: 5 per second (financial safety) */
    payments: new RateLimiter("payments", {
        maxTokens: 5,
        refillRate: 1,
    }),

    /** RPC calls: 100 per second */
    rpcCalls: new RateLimiter("rpc-calls", {
        maxTokens: 100,
        refillRate: 20,
    }),
};