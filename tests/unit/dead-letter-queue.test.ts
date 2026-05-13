import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryDeadLetterQueue } from "../../src/utils/dead-letter-queue.js";
import { type QueuedTransaction } from "../../src/utils/types.js";

function makeTx(overrides: Partial<QueuedTransaction> = {}): QueuedTransaction {
    return {
        id: "tx-1",
        idempotencyKey: "key-1",
        to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        amount: 1000000n,
        token: "ETH",
        createdAt: new Date(),
        status: "dead_letter",
        retryCount: 3,
        lastError: "network error",
        deadLetterReason: "Max retries exhausted",
        deadLetteredAt: new Date(),
        ...overrides,
    };
}

describe("InMemoryDeadLetterQueue", () => {
    let dlq: InMemoryDeadLetterQueue;

    beforeEach(() => {
        dlq = new InMemoryDeadLetterQueue(100);
    });

    it("should push and list entries", async () => {
        await dlq.push({
            transaction: makeTx(),
            failedAt: new Date(),
            reason: "network error",
            retriesExhausted: 3,
        });

        const entries = await dlq.list();
        expect(entries.length).toBe(1);
        expect(entries[0].reason).toBe("network error");
        expect(entries[0].retriesExhausted).toBe(3);
    });

    it("should remove entries by transaction ID", async () => {
        await dlq.push({
            transaction: makeTx({ id: "tx-to-remove" }),
            failedAt: new Date(),
            reason: "test",
            retriesExhausted: 3,
        });

        await dlq.remove("tx-to-remove");

        const entries = await dlq.list();
        expect(entries.length).toBe(0);
    });

    it("should count entries", async () => {
        expect(await dlq.count()).toBe(0);

        await dlq.push({
            transaction: makeTx({ id: "tx-1" }),
            failedAt: new Date(),
            reason: "error 1",
            retriesExhausted: 3,
        });
        await dlq.push({
            transaction: makeTx({ id: "tx-2" }),
            failedAt: new Date(),
            reason: "error 2",
            retriesExhausted: 3,
        });

        expect(await dlq.count()).toBe(2);
    });

    it("should limit list results", async () => {
        for (let i = 0; i < 10; i++) {
            await dlq.push({
                transaction: makeTx({ id: `tx-${i}` }),
                failedAt: new Date(),
                reason: `error ${i}`,
                retriesExhausted: 3,
            });
        }

        const entries = await dlq.list(5);
        expect(entries.length).toBe(5);
    });

    it("should trim oldest entries when exceeding max", async () => {
        const smallDlq = new InMemoryDeadLetterQueue(5);

        for (let i = 0; i < 10; i++) {
            await smallDlq.push({
                transaction: makeTx({ id: `tx-${i}` }),
                failedAt: new Date(),
                reason: `error ${i}`,
                retriesExhausted: 3,
            });
        }

        expect(await smallDlq.count()).toBeLessThanOrEqual(5);
    });

    it("should filter by agent ID", async () => {
        await dlq.push({
            transaction: makeTx({ idempotencyKey: "agent-1-key" }),
            failedAt: new Date(),
            reason: "error",
            retriesExhausted: 3,
        });
        await dlq.push({
            transaction: makeTx({ idempotencyKey: "agent-2-key" }),
            failedAt: new Date(),
            reason: "error",
            retriesExhausted: 3,
        });

        const agent1Entries = await dlq.listByAgent("agent-1");
        expect(agent1Entries.length).toBe(1);
    });
});