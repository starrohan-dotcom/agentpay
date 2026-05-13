import {
    type RetryConfig,
    DEFAULT_RETRY_CONFIG,
} from "./types.js";
import { logger } from "./logger.js";

/**
 * Production-grade retry utility with exponential backoff and jitter.
 * Used for all RPC calls and transaction submissions.
 */
export class RetryManager {
    private config: RetryConfig;

    constructor(config: Partial<RetryConfig> = {}) {
        this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    }

    /**
     * Executes an async operation with retry logic.
     * Implements exponential backoff with full jitter.
     *
     * @param operation - The async function to retry
     * @param operationName - Human-readable name for logging
     * @returns The result of the operation
     * @throws The last error if all retries are exhausted
     */
    async execute<T>(
        operation: () => Promise<T>,
        operationName: string,
    ): Promise<T> {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    logger.info(`Retry attempt ${attempt}/${this.config.maxRetries} for ${operationName}`);
                }
                return await operation();
            } catch (err: any) {
                lastError = err;

                if (attempt === this.config.maxRetries) {
                    logger.error(
                        `All ${this.config.maxRetries} retries exhausted for ${operationName}`,
                        { error: err.message },
                    );
                    break;
                }

                // Only retry on transient errors
                if (!this.isRetryable(err)) {
                    logger.warn(`Non-retryable error for ${operationName}, not retrying`, {
                        error: err.message,
                    });
                    throw err;
                }

                const delay = this.calculateDelay(attempt);
                logger.warn(
                    `Retryable error for ${operationName}, waiting ${delay}ms before retry ${attempt + 1}`,
                    { error: err.message },
                );
                await this.sleep(delay);
            }
        }

        throw lastError ?? new Error(`Unknown error in ${operationName}`);
    }

    /**
     * Determines if an error is retryable.
     * Retries on network errors, timeouts, and RPC rate limits.
     */
    private isRetryable(error: any): boolean {
        const message = (error?.message ?? "").toLowerCase();

        const retryablePatterns = [
            "timeout",
            "network",
            "econnrefused",
            "econnreset",
            "etimedout",
            "429",
            "rate limit",
            "too many requests",
            "nonce too low",
            "replacement transaction underpriced",
            "already known",
            "socket hang up",
            "internal server error",
            "service unavailable",
            "gateway timeout",
        ];

        return retryablePatterns.some((pattern) => message.includes(pattern));
    }

    /**
     * Calculates delay with exponential backoff and full jitter.
     * Formula: min(maxDelay, baseDelay * (multiplier ^ attempt)) * random(0, 1)
     */
    private calculateDelay(attempt: number): number {
        const exponentialDelay =
            this.config.baseDelayMs *
            Math.pow(this.config.backoffMultiplier, attempt);
        const cappedDelay = Math.min(exponentialDelay, this.config.maxDelayMs);
        // Full jitter: random between 0 and cappedDelay
        return Math.floor(Math.random() * cappedDelay);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

/** Singleton retry manager instance */
export const retryManager = new RetryManager();