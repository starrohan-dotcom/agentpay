import { randomUUID } from "crypto";
import { type Address, type Hash } from "viem";
import { type QueuedTransaction } from "./types.js";
import { logger } from "./logger.js";
import { pendingTransactions } from "./metrics.js";
import { deadLetterQueue } from "./dead-letter-queue.js";

/**
 * Production-grade transaction queue with idempotency guarantees.
 *
 * Ensures:
 * - No duplicate payments via idempotency keys
 * - Ordered processing (FIFO)
 * - Status tracking for each transaction
 * - Graceful shutdown with in-flight completion
 * - Dead letter queue for permanently failed transactions (v1.6.0)
 */
export class TransactionQueue {
    private queue: QueuedTransaction[] = [];
    private processing: Set<string> = new Set();
    private completed: Map<string, QueuedTransaction> = new Map();
    private isShuttingDown: boolean = false;
    private readonly maxRetries: number;

    constructor(maxRetries: number = 3) {
        this.maxRetries = maxRetries;
    }

    /**
     * Enqueues a transaction for processing.
     * Returns the queue item with a generated idempotency key if none provided.
     */
    enqueue(params: {
        to: Address;
        amount: bigint;
        token: "ETH" | "USDC";
        memo?: string;
        idempotencyKey?: string;
    }): QueuedTransaction {
        const idempotencyKey = params.idempotencyKey ?? randomUUID();

        // Check for duplicate idempotency key
        const existing = this.findByIdempotencyKey(idempotencyKey);
        if (existing) {
            logger.warn("Duplicate idempotency key detected, returning existing transaction", {
                idempotencyKey,
                status: existing.status,
            });
            return existing;
        }

        const tx: QueuedTransaction = {
            id: randomUUID(),
            idempotencyKey,
            to: params.to,
            amount: params.amount,
            token: params.token,
            memo: params.memo,
            createdAt: new Date(),
            status: "pending",
            retryCount: 0,
        };

        this.queue.push(tx);
        pendingTransactions.set({}, this.queue.length);

        logger.info("Transaction enqueued", {
            txId: tx.id,
            idempotencyKey,
            to: tx.to,
            amount: tx.amount.toString(),
            token: tx.token,
        });

        return tx;
    }

    /**
     * Dequeues the next pending transaction for processing.
     * Returns null if the queue is empty or shutting down.
     */
    dequeue(): QueuedTransaction | null {
        if (this.isShuttingDown) return null;

        const tx = this.queue.find((t) => t.status === "pending");
        if (!tx) return null;

        tx.status = "processing";
        this.processing.add(tx.id);
        pendingTransactions.set({}, this.queue.filter((t) => t.status === "pending").length);

        return tx;
    }

    /**
     * Marks a transaction as completed.
     */
    markCompleted(id: string, hash: Hash): void {
        const tx = this.findInQueue(id);
        if (!tx) return;

        tx.status = "completed";
        this.processing.delete(id);
        this.completed.set(tx.idempotencyKey, tx);
        pendingTransactions.set({}, this.queue.filter((t) => t.status === "pending").length);

        logger.info("Transaction completed", { txId: id, hash });
    }

    /**
     * Marks a transaction as failed (will be retried or sent to dead letter queue).
     */
    async markFailed(id: string, error: string): Promise<void> {
        const tx = this.findInQueue(id);
        if (!tx) return;

        tx.status = "failed";
        tx.lastError = error;
        tx.retryCount++;
        this.processing.delete(id);

        // Re-queue for retry if under max retries
        if (tx.retryCount < this.maxRetries) {
            tx.status = "pending";
            logger.warn("Transaction failed, will retry", {
                txId: id,
                retryCount: tx.retryCount,
                error,
            });
        } else {
            // Move to dead letter queue
            tx.status = "dead_letter";
            tx.deadLetterReason = error;
            tx.deadLetteredAt = new Date();

            await deadLetterQueue.push({
                transaction: tx,
                failedAt: new Date(),
                reason: error,
                retriesExhausted: tx.retryCount,
            });

            logger.error("Transaction moved to dead letter queue after max retries", {
                txId: id,
                retryCount: tx.retryCount,
                error,
            });
        }

        pendingTransactions.set({}, this.queue.filter((t) => t.status === "pending").length);
    }

    /**
     * Finds a transaction by idempotency key across all states.
     */
    findByIdempotencyKey(key: string): QueuedTransaction | undefined {
        // Check completed cache
        if (this.completed.has(key)) return this.completed.get(key);

        // Check queue
        return this.queue.find((t) => t.idempotencyKey === key);
    }

    /**
     * Finds a transaction by internal ID.
     */
    private findInQueue(id: string): QueuedTransaction | undefined {
        return this.queue.find((t) => t.id === id);
    }

    /**
     * Returns all pending transactions.
     */
    getPending(): QueuedTransaction[] {
        return this.queue.filter((t) => t.status === "pending");
    }

    /**
     * Returns all processing transactions.
     */
    getProcessing(): QueuedTransaction[] {
        return this.queue.filter((t) => t.status === "processing");
    }

    /**
     * Returns all dead letter transactions.
     */
    getDeadLetters(): QueuedTransaction[] {
        return this.queue.filter((t) => t.status === "dead_letter");
    }

    /**
     * Returns queue statistics.
     */
    getStats(): {
        pending: number;
        processing: number;
        completed: number;
        failed: number;
        deadLetter: number;
        total: number;
    } {
        const pending = this.queue.filter((t) => t.status === "pending").length;
        const processing = this.processing.size;
        const completed = this.completed.size;
        const failed = this.queue.filter((t) => t.status === "failed" && t.retryCount < this.maxRetries).length;
        const deadLetter = this.queue.filter((t) => t.status === "dead_letter").length;

        return {
            pending,
            processing,
            completed,
            failed,
            deadLetter,
            total: this.queue.length + this.completed.size,
        };
    }

    /**
     * Initiates graceful shutdown. No new transactions will be dequeued.
     * Returns a promise that resolves when all in-flight transactions complete.
     */
    async shutdown(timeoutMs: number = 30000): Promise<void> {
        this.isShuttingDown = true;
        logger.info("Transaction queue shutting down", {
            inFlight: this.processing.size,
        });

        const startTime = Date.now();

        while (this.processing.size > 0) {
            if (Date.now() - startTime > timeoutMs) {
                logger.warn("Transaction queue shutdown timed out", {
                    remainingInFlight: this.processing.size,
                });
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        logger.info("Transaction queue shutdown complete");
    }
}

/** Singleton transaction queue instance */
export const transactionQueue = new TransactionQueue();