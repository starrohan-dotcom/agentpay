export { AgentWallet, policy, PolicyBuilder } from "./AgentWallet.js";
export type {
    SpendingPolicy,
    PayOptions,
    TxRecord,
    WalletConfig,
} from "./AgentWallet.js";
export { FileStorage } from "./storage/FileStorage.js";
export { MemoryStorage } from "./storage/MemoryStorage.js";
export { RedisStorage } from "./storage/RedisStorage.js";
export { PostgresStorage } from "./storage/PostgresStorage.js";
export type { StorageProvider, AgentState } from "./storage/StorageProvider.js";
export { AgentPayTool } from "./plugins/langchain.js";
export { createCrewAIPayTool } from "./plugins/crewai.js";
export { getAutoGenPayTool } from "./plugins/autogen.js";

// ── Production Infrastructure ──
export { RetryManager, retryManager } from "./utils/retry.js";
export { CircuitBreaker, rpcCircuitBreaker } from "./utils/circuit-breaker.js";
export { AuditLogger, auditLogger } from "./utils/audit.js";
export { TransactionQueue, transactionQueue } from "./utils/transaction-queue.js";
export { RateLimiter, rateLimiters } from "./utils/rate-limiter.js";
export {
    Counter,
    Gauge,
    Histogram,
    paymentsTotal,
    paymentsSucceeded,
    paymentsFailed,
    policyViolations,
    activeAgents,
    paymentLatency,
    rpcLatency,
    circuitBreakerState,
    pendingTransactions,
    getMetricsAsText,
} from "./utils/metrics.js";
export {
    CircuitState,
    type RetryConfig,
    type CircuitBreakerConfig,
    type SmartAccountClient,
    type WalletOperations,
    type PublicClientOperations,
    type QueuedTransaction,
    type AuditLogEntry,
    type HealthStatus,
    DEFAULT_RETRY_CONFIG,
    DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from "./utils/types.js";

// ── MCP ──
export { McpToolHandler } from "./mcp/handler.js";
export {
    getPaymentSafetyConfig,
    assertPaymentsEnabled,
    assertRecipientAllowed,
    getMcpTools,
    parsePaymentArgs,
    parseToken,
} from "./mcp/safety.js";
export type { PaymentSafetyConfig, McpToken } from "./mcp/safety.js";
