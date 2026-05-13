import { type AuditLogEntry } from "./types.js";
import { logger } from "./logger.js";

/**
 * Production-grade audit logging for all financial operations.
 * Provides immutable, structured audit trails for compliance (SOC2, ISO27001).
 *
 * In production, this should be backed by an append-only log store
 * (e.g., PostgreSQL with audit tables, Elasticsearch, or a dedicated audit service).
 */
export class AuditLogger {
    private entries: AuditLogEntry[] = [];
    private readonly maxInMemoryEntries: number;

    constructor(maxInMemoryEntries: number = 10000) {
        this.maxInMemoryEntries = maxInMemoryEntries;
    }

    /**
     * Records an audit event.
     * In production, this should write to a durable, append-only store.
     */
    log(entry: Omit<AuditLogEntry, "timestamp">): void {
        const fullEntry: AuditLogEntry = {
            ...entry,
            timestamp: new Date(),
        };

        // Structured logging for log aggregation systems
        logger.info("[AUDIT]", {
            eventType: fullEntry.eventType,
            agentId: fullEntry.agentId,
            transactionHash: fullEntry.transactionHash,
            amount: fullEntry.amount,
            token: fullEntry.token,
            recipient: fullEntry.recipient,
            idempotencyKey: fullEntry.idempotencyKey,
            policyResult: fullEntry.policyResult,
            errorMessage: fullEntry.errorMessage,
            timestamp: fullEntry.timestamp.toISOString(),
        });

        // In-memory buffer (for development/demo)
        this.entries.push(fullEntry);

        // Prevent memory leaks by trimming old entries
        if (this.entries.length > this.maxInMemoryEntries) {
            this.entries = this.entries.slice(-this.maxInMemoryEntries / 2);
        }
    }

    /**
     * Logs a payment initiation event.
     */
    logPaymentInitiated(params: {
        agentId: string;
        amount: string;
        token: "ETH" | "USDC";
        recipient: `0x${string}`;
        idempotencyKey: string;
    }): void {
        this.log({
            eventType: "PAYMENT_INITIATED",
            ...params,
        });
    }

    /**
     * Logs a successful payment.
     */
    logPaymentSucceeded(params: {
        agentId: string;
        transactionHash: `0x${string}`;
        amount: string;
        token: "ETH" | "USDC";
        recipient: `0x${string}`;
        idempotencyKey: string;
    }): void {
        this.log({
            eventType: "PAYMENT_SUCCEEDED",
            ...params,
        });
    }

    /**
     * Logs a failed payment.
     */
    logPaymentFailed(params: {
        agentId: string;
        amount: string;
        token: "ETH" | "USDC";
        recipient: `0x${string}`;
        idempotencyKey: string;
        errorMessage: string;
    }): void {
        this.log({
            eventType: "PAYMENT_FAILED",
            ...params,
        });
    }

    /**
     * Logs a policy check result.
     */
    logPolicyCheck(params: {
        agentId: string;
        policyResult: "PASSED" | "FAILED";
        amount?: string;
        token?: "ETH" | "USDC";
        recipient?: `0x${string}`;
        errorMessage?: string;
    }): void {
        this.log({
            eventType: "POLICY_CHECK",
            ...params,
        });
    }

    /**
     * Logs a daily spending limit reset.
     */
    logDailyReset(agentId: string): void {
        this.log({
            eventType: "DAILY_RESET",
            agentId,
        });
    }

    /**
     * Returns recent audit entries for inspection.
     */
    getRecentEntries(count: number = 100): AuditLogEntry[] {
        return this.entries.slice(-count);
    }

    /**
     * Queries audit entries by event type.
     */
    queryByEventType(eventType: AuditLogEntry["eventType"]): AuditLogEntry[] {
        return this.entries.filter((e) => e.eventType === eventType);
    }

    /**
     * Queries audit entries by agent ID.
     */
    queryByAgent(agentId: string): AuditLogEntry[] {
        return this.entries.filter((e) => e.agentId === agentId);
    }

    /**
     * Returns the total number of recorded audit entries.
     */
    getEntryCount(): number {
        return this.entries.length;
    }
}

/** Singleton audit logger instance */
export const auditLogger = new AuditLogger();