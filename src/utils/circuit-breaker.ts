import {
    CircuitState,
    type CircuitBreakerConfig,
    DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from "./types.js";
import { logger } from "./logger.js";

/**
 * Production-grade circuit breaker for RPC and external service calls.
 * Prevents cascading failures by stopping calls to failing services.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Failures exceeded threshold, requests are rejected immediately
 * - HALF_OPEN: After timeout, limited requests allowed to test recovery
 */
export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private lastFailureTime: number = 0;
    private halfOpenRequestCount: number = 0;
    private config: CircuitBreakerConfig;

    constructor(config: Partial<CircuitBreakerConfig> = {}) {
        this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
    }

    /**
     * Executes an operation with circuit breaker protection.
     *
     * @param operation - The async function to protect
     * @param fallback - Optional fallback function if circuit is open
     * @returns The result of the operation or fallback
     * @throws Error if circuit is open and no fallback provided
     */
    async execute<T>(
        operation: () => Promise<T>,
        fallback?: () => Promise<T>,
    ): Promise<T> {
        if (this.state === CircuitState.OPEN) {
            if (this.shouldAttemptReset()) {
                this.transitionTo(CircuitState.HALF_OPEN);
            } else {
                logger.warn("Circuit breaker is OPEN, rejecting request");
                if (fallback) {
                    return fallback();
                }
                throw new Error("Circuit breaker is OPEN - service unavailable");
            }
        }

        if (
            this.state === CircuitState.HALF_OPEN &&
            this.halfOpenRequestCount >= this.config.halfOpenMaxRequests
        ) {
            logger.warn("Circuit breaker HALF_OPEN limit reached, rejecting request");
            if (fallback) {
                return fallback();
            }
            throw new Error("Circuit breaker HALF_OPEN limit reached");
        }

        if (this.state === CircuitState.HALF_OPEN) {
            this.halfOpenRequestCount++;
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (err: any) {
            this.onFailure();
            throw err;
        }
    }

    /**
     * Records a success, resetting the circuit if in HALF_OPEN state.
     */
    private onSuccess(): void {
        if (this.state === CircuitState.HALF_OPEN) {
            logger.info("Circuit breaker recovered, transitioning to CLOSED");
            this.reset();
        }
        // In CLOSED state, reset failure count on success
        if (this.state === CircuitState.CLOSED) {
            this.failureCount = 0;
        }
    }

    /**
     * Records a failure, potentially opening the circuit.
     */
    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = Date.now();

        if (
            this.state === CircuitState.HALF_OPEN ||
            (this.state === CircuitState.CLOSED &&
                this.failureCount >= this.config.failureThreshold)
        ) {
            this.transitionTo(CircuitState.OPEN);
        }
    }

    /**
     * Checks if enough time has passed to attempt reset from OPEN.
     */
    private shouldAttemptReset(): boolean {
        return (
            Date.now() - this.lastFailureTime >= this.config.resetTimeoutMs
        );
    }

    /**
     * Transitions the circuit breaker to a new state.
     */
    private transitionTo(newState: CircuitState): void {
        const oldState = this.state;
        this.state = newState;

        if (newState === CircuitState.OPEN) {
            logger.error(
                `Circuit breaker transitioned from ${oldState} to OPEN after ${this.failureCount} failures`,
            );
        } else if (newState === CircuitState.HALF_OPEN) {
            this.halfOpenRequestCount = 0;
            logger.warn("Circuit breaker transitioned from OPEN to HALF_OPEN");
        }
    }

    /**
     * Resets the circuit breaker to CLOSED state.
     */
    private reset(): void {
        this.failureCount = 0;
        this.halfOpenRequestCount = 0;
        this.state = CircuitState.CLOSED;
    }

    /**
     * Returns the current state for health checks.
     */
    getState(): CircuitState {
        return this.state;
    }

    /**
     * Returns metrics about the circuit breaker.
     */
    getMetrics(): {
        state: CircuitState;
        failureCount: number;
        lastFailureTime: number;
    } {
        return {
            state: this.state,
            failureCount: this.failureCount,
            lastFailureTime: this.lastFailureTime,
        };
    }
}

/** Singleton circuit breaker for RPC calls */
export const rpcCircuitBreaker = new CircuitBreaker();