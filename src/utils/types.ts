import { type Address, type Hash } from "viem";

/**
 * Strongly-typed smart account client interface.
 */
export interface SmartAccountClient {
    address: Address;
    sendTransaction(args: {
        to: Address;
        value?: bigint;
        data?: `0x${string}`;
    }): Promise<Hash>;
    signMessage(args: { message: string }): Promise<`0x${string}`>;
}

/**
 * Strongly-typed wallet operations interface for EOA operations.
 */
export interface WalletOperations {
    sendTransaction(args: {
        to: Address;
        value?: bigint;
        data?: `0x${string}`;
    }): Promise<Hash>;
    writeContract(args: {
        address: Address;
        abi: readonly Record<string, unknown>[];
        functionName: string;
        args: readonly unknown[];
    }): Promise<Hash>;
}

/**
 * Strongly-typed public client operations interface.
 */
export interface PublicClientOperations {
    getBalance(args: { address: Address }): Promise<bigint>;
    readContract(args: {
        address: Address;
        abi: readonly Record<string, unknown>[];
        functionName: string;
        args?: readonly unknown[];
    }): Promise<unknown>;
    simulateContract(args: {
        account: { address: Address };
        address: Address;
        abi: readonly Record<string, unknown>[];
        functionName: string;
        args: readonly unknown[];
    }): Promise<{ request: Record<string, unknown> }>;
    waitForTransactionReceipt(args: { hash: Hash }): Promise<Record<string, unknown>>;
    getBlockNumber(): Promise<bigint>;
}

/**
 * Retry configuration for transaction operations.
 */
export interface RetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
};

/**
 * Circuit breaker states.
 */
export enum CircuitState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN",
}

/**
 * Circuit breaker configuration.
 */
export interface CircuitBreakerConfig {
    failureThreshold: number;
    resetTimeoutMs: number;
    halfOpenMaxRequests: number;
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    halfOpenMaxRequests: 3,
};

/**
 * Transaction queue item for ordered processing.
 */
export interface QueuedTransaction {
    id: string;
    idempotencyKey: string;
    to: Address;
    amount: bigint;
    token: "ETH" | "USDC";
    memo?: string;
    createdAt: Date;
    status: "pending" | "processing" | "completed" | "failed" | "dead_letter";
    retryCount: number;
    lastError?: string;
    deadLetterReason?: string;
    deadLetteredAt?: Date;
}

/**
 * Audit log entry for financial transactions.
 */
export interface AuditLogEntry {
    timestamp: Date;
    eventType:
    | "PAYMENT_INITIATED"
    | "PAYMENT_SUCCEEDED"
    | "PAYMENT_FAILED"
    | "POLICY_CHECK"
    | "DAILY_RESET"
    | "BALANCE_CHECK";
    agentId: string;
    transactionHash?: Hash;
    amount?: string;
    token?: "ETH" | "USDC";
    recipient?: Address;
    idempotencyKey?: string;
    policyResult?: "PASSED" | "FAILED";
    errorMessage?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Health check response.
 */
export interface HealthStatus {
    status: "healthy" | "degraded" | "unhealthy";
    uptime: number;
    rpcConnected: boolean;
    walletInitialized: boolean;
    chainId?: number;
    lastBlockNumber?: bigint;
    circuitBreakerState: CircuitState;
    pendingTransactions: number;
}

// ── Production-Grade Additions (v1.6.0) ──

/**
 * Standardized API error response with correlation ID for tracing.
 */
export interface ApiErrorResponse {
    error: {
        code: string;
        message: string;
        correlationId: string;
        timestamp: string;
        details?: Record<string, unknown>;
    };
}

/**
 * Secrets provider interface for secure key management.
 * Implementations: EnvSecretsProvider, AwsKmsSecretsProvider, HashiCorpVaultSecretsProvider.
 */
export interface SecretsProvider {
    /** Retrieves the private key for signing. Never logged or exposed in plaintext. */
    getPrivateKey(): Promise<`0x${string}`>;
    /** Retrieves an arbitrary secret by name. */
    getSecret(name: string): Promise<string>;
    /** Whether this provider is healthy and reachable. */
    healthCheck(): Promise<boolean>;
}

/**
 * Tracing span context for OpenTelemetry-compatible distributed tracing.
 */
export interface TraceSpan {
    /** Start a child span. */
    startSpan(name: string, attributes?: Record<string, string | number | boolean>): TraceSpan;
    /** Set a single attribute on the span. */
    setAttribute(key: string, value: string | number | boolean): void;
    /** Record an exception on the span. */
    recordException(error: Error): void;
    /** Mark the span as successful and end it. */
    end(): void;
    /** Mark the span as errored and end it. */
    endWithError(error: Error): void;
}

/**
 * Tracer interface for creating spans.
 */
export interface Tracer {
    /** Start a new root span. */
    startSpan(name: string, attributes?: Record<string, string | number | boolean>): TraceSpan;
}

/**
 * Dead letter queue entry for permanently failed transactions.
 */
export interface DeadLetterEntry {
    transaction: QueuedTransaction;
    failedAt: Date;
    reason: string;
    retriesExhausted: number;
}

/**
 * Dead letter queue interface for storing permanently failed transactions.
 */
export interface DeadLetterQueue {
    /** Push a failed transaction to the dead letter queue. */
    push(entry: DeadLetterEntry): Promise<void>;
    /** List all dead letter entries. */
    list(limit?: number): Promise<DeadLetterEntry[]>;
    /** Retry a dead letter entry (removes from DLQ if successful). */
    remove(id: string): Promise<void>;
    /** Get the count of dead letter entries. */
    count(): Promise<number>;
}