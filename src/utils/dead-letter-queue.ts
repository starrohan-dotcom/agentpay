import { type DeadLetterQueue, type DeadLetterEntry, type QueuedTransaction } from "./types.js";
import { logger } from "./logger.js";

/**
 * In-memory dead letter queue for permanently failed transactions.
 *
 * In production, replace with a persistent store (PostgreSQL, Redis streams)
 * to survive restarts and enable operational recovery workflows.
 */
export class InMemoryDeadLetterQueue implements DeadLetterQueue {
    private entries: DeadLetterEntry[] = [];
    private readonly maxEntries: number;

    constructor(maxEntries: number = 10000) {
        this.maxEntries = maxEntries;
    }

    async push(entry: DeadLetterEntry): Promise<void> {
        this.entries.push(entry);

        // Prevent unbounded growth
        if (this.entries.length > this.maxEntries) {
            const removed = this.entries.splice(0, this.entries.length - this.maxEntries);
            logger.warn("Dead letter queue trimmed oldest entries", {
                removed: removed.length,
                remaining: this.entries.length,
            });
        }

        logger.error("Transaction moved to dead letter queue", {
            txId: entry.transaction.id,
            idempotencyKey: entry.transaction.idempotencyKey,
            reason: entry.reason,
            retriesExhausted: entry.retriesExhausted,
        });
    }

    async list(limit: number = 100): Promise<DeadLetterEntry[]> {
        return this.entries.slice(-limit);
    }

    async remove(id: string): Promise<void> {
        const index = this.entries.findIndex((e) => e.transaction.id === id);
        if (index !== -1) {
            this.entries.splice(index, 1);
            logger.info("Dead letter entry removed", { txId: id });
        }
    }

    async count(): Promise<number> {
        return this.entries.length;
    }

    /**
     * Returns all entries for a specific agent.
     */
    async listByAgent(agentId: string, limit: number = 100): Promise<DeadLetterEntry[]> {
        return this.entries
            .filter((e) => e.transaction.idempotencyKey.includes(agentId))
            .slice(-limit);
    }
}

/** Singleton dead letter queue instance */
export const deadLetterQueue: DeadLetterQueue = new InMemoryDeadLetterQueue();