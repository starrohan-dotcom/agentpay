import { type Address, type Hash } from "viem";

/**
 * Strongly-typed smart account client interface.
 * Replaces the `any` type previously used for smartAccountClient.
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
        abi: readonly any[];
        functionName: string;
        args: readonly any[];
    }): Promise<Hash>;
}

/**
 * Strongly-typed public client operations interface.
 */
export interface PublicClientOperations {
    getBalance(args: { address: Address }): Promise<bigint>;
    readContract(args: {
        address: Address;
        abi: readonly any[];
        functionName: string;
        args?: readonly any[];
    }): Promise<any>;
    simulateContract(args: {
        account: { address: Address };
        address: Address;
        abi: readonly any[];
        functionName: string;
        args: readonly any[];
    }): Promise<{ request: any }>;
    waitForTransactionReceipt(args: { hash: Hash }): Promise<any>;
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
    status: "pending" | "processing" | "completed" | "failed";
    retryCount: number;
    lastError?: string;
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