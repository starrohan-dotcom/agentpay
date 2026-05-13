import { describe, it, expect, beforeEach } from "vitest";
import { RetryManager } from "../src/utils/retry.js";
import { CircuitBreaker, rpcCircuitBreaker } from "../src/utils/circuit-breaker.js";
import { CircuitState } from "../src/utils/types.js";
import { RateLimiter } from "../src/utils/rate-limiter.js";
import { TransactionQueue } from "../src/utils/transaction-queue.js";
import { AuditLogger } from "../src/utils/audit.js";
import {
    Counter,
    Gauge,
    Histogram,
    paymentsTotal,
    paymentsSucceeded,
    paymentsFailed,
    policyViolations,
} from "../src/utils/metrics.js";

// ── Retry Manager Tests ──

describe("RetryManager", () => {
    let retry: RetryManager;

    beforeEach(() => {
        retry = new RetryManager({ maxRetries: 2, baseDelayMs: 10, maxDelayMs: 100 });
    });

    it("should succeed on first attempt", async () => {
        const result = await retry.execute(async () => "success", "test-op");
        expect(result).toBe("success");
    });

    it("should retry on transient errors and eventually succeed", async () => {
        let attempts = 0;
        const result = await retry.execute(async () => {
            attempts++;
            if (attempts < 2) throw new Error("network timeout");
            return "recovered";
        }, "test-op");
        expect(result).toBe("recovered");
        expect(attempts).toBe(2);
    });

    it("should throw after exhausting all retries", async () => {
        await expect(
            retry.execute(async () => {
                throw new Error("persistent network error");
            }, "test-op"),
        ).rejects.toThrow("persistent network error");
    });

    it("should not retry on non-retryable errors", async () => {
        let attempts = 0;
        await expect(
            retry.execute(async () => {
                attempts++;
                throw new Error("invalid signature");
            }, "test-op"),
        ).rejects.toThrow("invalid signature");
        expect(attempts).toBe(1); // No retry
    });
});

// ── Circuit Breaker Tests ──

describe("CircuitBreaker", () => {
    let cb: CircuitBreaker;

    beforeEach(() => {
        cb = new CircuitBreaker({
            failureThreshold: 2,
            resetTimeoutMs: 100,
            halfOpenMaxRequests: 1,
        });
    });

    it("should start in CLOSED state", () => {
        expect(cb.getState()).toBe(CircuitState.CLOSED);
    });

    it("should open circuit after threshold failures", async () => {
        for (let i = 0; i < 2; i++) {
            await expect(cb.execute(async () => {
                throw new Error("RPC error");
            })).rejects.toThrow();
        }
        expect(cb.getState()).toBe(CircuitState.OPEN);
    });

    it("should reject requests when OPEN", async () => {
        // Force open
        for (let i = 0; i < 2; i++) {
            await expect(cb.execute(async () => {
                throw new Error("fail");
            })).rejects.toThrow();
        }

        await expect(cb.execute(async () => "should not run")).rejects.toThrow(
            /Circuit breaker is OPEN/,
        );
    });

    it("should use fallback when circuit is OPEN", async () => {
        for (let i = 0; i < 2; i++) {
            await expect(cb.execute(async () => {
                throw new Error("fail");
            })).rejects.toThrow();
        }

        const result = await cb.execute(
            async () => "primary",
            async () => "fallback",
        );
        expect(result).toBe("fallback");
    });

    it("should reset failure count on success in CLOSED state", async () => {
        await expect(cb.execute(async () => {
            throw new Error("fail");
        })).rejects.toThrow();

        await cb.execute(async () => "success");

        // One more failure should NOT open the circuit (count was reset)
        await expect(cb.execute(async () => {
            throw new Error("fail");
        })).rejects.toThrow();
        expect(cb.getState()).toBe(CircuitState.CLOSED);
    });
});

// ── Rate Limiter Tests ──

describe("RateLimiter", () => {
    it("should allow requests within limit", () => {
        const rl = new RateLimiter("test", { maxTokens: 5, refillRate: 100 });
        for (let i = 0; i < 5; i++) {
            expect(rl.tryConsume()).toBe(true);
        }
    });

    it("should reject requests beyond limit", () => {
        const rl = new RateLimiter("test", { maxTokens: 2, refillRate: 0 });
        expect(rl.tryConsume()).toBe(true);
        expect(rl.tryConsume()).toBe(true);
        expect(rl.tryConsume()).toBe(false);
    });

    it("should reset to full capacity", () => {
        const rl = new RateLimiter("test", { maxTokens: 3, refillRate: 0 });
        rl.tryConsume();
        rl.tryConsume();
        expect(rl.availableTokens()).toBe(1);
        rl.reset();
        expect(rl.availableTokens()).toBe(3);
    });
});

// ── Transaction Queue Tests ──

describe("TransactionQueue", () => {
    let queue: TransactionQueue;

    beforeEach(() => {
        queue = new TransactionQueue();
    });

    it("should enqueue and dequeue transactions in FIFO order", () => {
        const tx1 = queue.enqueue({
            to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            amount: 1000n,
            token: "ETH",
        });
        const tx2 = queue.enqueue({
            to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            amount: 2000n,
            token: "USDC",
        });

        const dequeued1 = queue.dequeue();
        const dequeued2 = queue.dequeue();

        expect(dequeued1?.id).toBe(tx1.id);
        expect(dequeued2?.id).toBe(tx2.id);
    });

    it("should prevent duplicate idempotency keys", () => {
        const key = "test-idempotency-key-123";
        const tx1 = queue.enqueue({
            to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            amount: 1000n,
            token: "ETH",
            idempotencyKey: key,
        });
        const tx2 = queue.enqueue({
            to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            amount: 2000n,
            token: "ETH",
            idempotencyKey: key,
        });

        expect(tx2.id).toBe(tx1.id); // Same transaction returned
    });

    it("should track transaction status through lifecycle", () => {
        const tx = queue.enqueue({
            to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            amount: 1000n,
            token: "ETH",
        });

        expect(tx.status).toBe("pending");

        const dequeued = queue.dequeue();
        expect(dequeued?.status).toBe("processing");

        queue.markCompleted(
            tx.id,
            "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        );

        const found = queue.findByIdempotencyKey(tx.idempotencyKey);
        expect(found?.status).toBe("completed");
    });

    it("should retry failed transactions up to 3 times", () => {
        const tx = queue.enqueue({
            to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            amount: 1000n,
            token: "ETH",
        });

        queue.dequeue();
        queue.markFailed(tx.id, "RPC timeout");

        // Should be re-queued as pending
        const retried = queue.dequeue();
        expect(retried?.id).toBe(tx.id);
        expect(retried?.retryCount).toBe(1);
    });

    it("should return correct stats", () => {
        queue.enqueue({
            to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            amount: 1000n,
            token: "ETH",
        });
        queue.enqueue({
            to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            amount: 2000n,
            token: "USDC",
        });

        const stats = queue.getStats();
        expect(stats.pending).toBe(2);
        expect(stats.total).toBe(2);
    });
});

// ── Audit Logger Tests ──

describe("AuditLogger", () => {
    let audit: AuditLogger;

    beforeEach(() => {
        audit = new AuditLogger(100);
    });

    it("should log payment lifecycle events", () => {
        audit.logPaymentInitiated({
            agentId: "test-agent",
            amount: "0.001",
            token: "ETH",
            recipient: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            idempotencyKey: "key-123",
        });

        audit.logPaymentSucceeded({
            agentId: "test-agent",
            transactionHash: "0xabc123def456",
            amount: "0.001",
            token: "ETH",
            recipient: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            idempotencyKey: "key-123",
        });

        const entries = audit.getRecentEntries();
        expect(entries.length).toBe(2);
        expect(entries[0].eventType).toBe("PAYMENT_INITIATED");
        expect(entries[1].eventType).toBe("PAYMENT_SUCCEEDED");
    });

    it("should query by event type", () => {
        audit.logPaymentInitiated({
            agentId: "agent-1",
            amount: "0.001",
            token: "ETH",
            recipient: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            idempotencyKey: "key-1",
        });
        audit.logPaymentFailed({
            agentId: "agent-1",
            amount: "0.002",
            token: "USDC",
            recipient: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            idempotencyKey: "key-2",
            errorMessage: "insufficient funds",
        });

        const failed = audit.queryByEventType("PAYMENT_FAILED");
        expect(failed.length).toBe(1);
        expect(failed[0].errorMessage).toBe("insufficient funds");
    });

    it("should query by agent ID", () => {
        audit.logDailyReset("agent-a");
        audit.logDailyReset("agent-b");
        audit.logDailyReset("agent-a");

        const agentA = audit.queryByAgent("agent-a");
        expect(agentA.length).toBe(2);
    });
});

// ── Metrics Tests ──

describe("Metrics", () => {
    describe("Counter", () => {
        it("should increment and track values", () => {
            const c = new Counter("test_total", "Test counter");
            c.inc({ status: "success" });
            c.inc({ status: "success" });
            c.inc({ status: "failed" });

            expect(c.get({ status: "success" })).toBe(2);
            expect(c.get({ status: "failed" })).toBe(1);
        });

        it("should output Prometheus format", () => {
            const c = new Counter("test_total", "Test counter");
            c.inc({}, 5);
            const output = c.toPrometheus();
            expect(output).toContain("# HELP test_total");
            expect(output).toContain("# TYPE test_total counter");
            expect(output).toContain("test_total 5");
        });
    });

    describe("Gauge", () => {
        it("should set, increment, and decrement", () => {
            const g = new Gauge("test_gauge", "Test gauge");
            g.set({}, 10);
            expect(g.get()).toBe(10);

            g.inc({}, 5);
            expect(g.get()).toBe(15);

            g.dec({}, 3);
            expect(g.get()).toBe(12);
        });
    });

    describe("Histogram", () => {
        it("should observe values and output Prometheus format", () => {
            const h = new Histogram("test_seconds", "Test histogram", [0.5, 1, 2]);
            h.observe({}, 0.3);
            h.observe({}, 1.5);
            h.observe({}, 3.0);

            const output = h.toPrometheus();
            expect(output).toContain("# HELP test_seconds");
            expect(output).toContain("# TYPE test_seconds histogram");
            expect(output).toContain("test_seconds_bucket");
            expect(output).toContain("test_seconds_sum");
            expect(output).toContain("test_seconds_count");
        });
    });

    describe("Application Metrics", () => {
        it("should track payment lifecycle", () => {
            paymentsTotal.inc({ token: "ETH", status: "initiated" });
            paymentsSucceeded.inc({ token: "ETH" });
            paymentsFailed.inc({ token: "USDC" });
            policyViolations.inc({ token: "ETH" });

            expect(paymentsTotal.get({ token: "ETH", status: "initiated" })).toBe(1);
            expect(paymentsSucceeded.get({ token: "ETH" })).toBe(1);
            expect(paymentsFailed.get({ token: "USDC" })).toBe(1);
            expect(policyViolations.get({ token: "ETH" })).toBe(1);
        });
    });
});