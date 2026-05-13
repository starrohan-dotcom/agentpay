import { describe, it, expect, beforeEach } from "vitest";
import { TransactionQueue } from "../../src/utils/transaction-queue.js";
import { type Address } from "viem";

const TEST_ADDRESS: Address = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";

describe("TransactionQueue", () => {
    let queue: TransactionQueue;

    beforeEach(() => {
        queue = new TransactionQueue(3); // max 3 retries
    });

    it("should enqueue a transaction", () => {
        const tx = queue.enqueue({
            to: TEST_ADDRESS,
            amount: 1000000n,
            token: "ETH",
        });

        expect(tx.status).toBe("pending");
        expect(tx.to).toBe(TEST_ADDRESS);
        expect(tx.idempotencyKey).toBeDefined();
    });

    it("should prevent duplicate idempotency keys", () => {
        const key = "test-idempotency-key";

        const tx1 = queue.enqueue({
            to: TEST_ADDRESS,
            amount: 1000000n,
            token: "ETH",
            idempotencyKey: key,
        });

        const tx2 = queue.enqueue({
            to: TEST_ADDRESS,
            amount: 2000000n,
            token: "ETH",
            idempotencyKey: key,
        });

        expect(tx2.id).toBe(tx1.id); // same transaction returned
        expect(tx2.amount).toBe(1000000n); // original amount
    });

    it("should dequeue transactions in FIFO order", () => {
        queue.enqueue({ to: TEST_ADDRESS, amount: 1000000n, token: "ETH", idempotencyKey: "key1" });
        queue.enqueue({ to: TEST_ADDRESS, amount: 2000000n, token: "ETH", idempotencyKey: "key2" });

        const tx1 = queue.dequeue();
        const tx2 = queue.dequeue();

        expect(tx1?.idempotencyKey).toBe("key1");
        expect(tx2?.idempotencyKey).toBe("key2");
    });

    it("should return null when dequeuing empty queue", () => {
        expect(queue.dequeue()).toBeNull();
    });

    it("should mark transactions as completed", () => {
        const tx = queue.enqueue({ to: TEST_ADDRESS, amount: 1000000n, token: "ETH" });
        queue.dequeue();

        queue.markCompleted(tx.id, "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x${string}`);

        const stats = queue.getStats();
        expect(stats.completed).toBe(1);
        expect(stats.pending).toBe(0);
    });

    it("should retry failed transactions up to maxRetries", async () => {
        const tx = queue.enqueue({ to: TEST_ADDRESS, amount: 1000000n, token: "ETH" });
        queue.dequeue();

        // Fail twice (should retry)
        await queue.markFailed(tx.id, "network error");
        let found = queue.getPending().find((t) => t.id === tx.id);
        expect(found?.status).toBe("pending");
        expect(found?.retryCount).toBe(1);

        queue.dequeue();
        await queue.markFailed(tx.id, "network error");
        found = queue.getPending().find((t) => t.id === tx.id);
        expect(found?.status).toBe("pending");
        expect(found?.retryCount).toBe(2);

        // Third failure should move to dead letter
        queue.dequeue();
        await queue.markFailed(tx.id, "network error");
        found = queue.getDeadLetters().find((t) => t.id === tx.id);
        expect(found?.status).toBe("dead_letter");
        expect(found?.retryCount).toBe(3);
    });

    it("should not dequeue when shutting down", () => {
        queue.enqueue({ to: TEST_ADDRESS, amount: 1000000n, token: "ETH" });

        queue.shutdown();

        expect(queue.dequeue()).toBeNull();
    });

    it("should return correct stats", () => {
        queue.enqueue({ to: TEST_ADDRESS, amount: 1000000n, token: "ETH", idempotencyKey: "k1" });
        queue.enqueue({ to: TEST_ADDRESS, amount: 2000000n, token: "USDC", idempotencyKey: "k2" });

        const stats = queue.getStats();
        expect(stats.pending).toBe(2);
        expect(stats.processing).toBe(0);
        expect(stats.completed).toBe(0);
        expect(stats.failed).toBe(0);
        expect(stats.deadLetter).toBe(0);
        expect(stats.total).toBe(2);
    });

    it("should find transactions by idempotency key", () => {
        const tx = queue.enqueue({
            to: TEST_ADDRESS,
            amount: 1000000n,
            token: "ETH",
            idempotencyKey: "find-me",
        });

        const found = queue.findByIdempotencyKey("find-me");
        expect(found?.id).toBe(tx.id);
    });

    it("should return undefined for unknown idempotency key", () => {
        expect(queue.findByIdempotencyKey("nonexistent")).toBeUndefined();
    });

    it("should handle graceful shutdown with timeout", async () => {
        queue.enqueue({ to: TEST_ADDRESS, amount: 1000000n, token: "ETH" });
        queue.dequeue(); // Now processing

        const shutdownPromise = queue.shutdown(100);
        await shutdownPromise;

        // Should have timed out but not thrown
        expect(queue.dequeue()).toBeNull();
    });
});