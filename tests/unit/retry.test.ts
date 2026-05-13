import { describe, it, expect, vi, beforeEach } from "vitest";
import { RetryManager } from "../../src/utils/retry.js";

describe("RetryManager", () => {
    let retry: RetryManager;

    beforeEach(() => {
        retry = new RetryManager({
            maxRetries: 3,
            baseDelayMs: 10,
            maxDelayMs: 100,
            backoffMultiplier: 2,
        });
    });

    it("should succeed on first attempt without retries", async () => {
        const operation = vi.fn().mockResolvedValue("success");

        const result = await retry.execute(operation, "test-op");

        expect(result).toBe("success");
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should retry on transient errors and eventually succeed", async () => {
        const operation = vi.fn()
            .mockRejectedValueOnce(new Error("network error"))
            .mockRejectedValueOnce(new Error("timeout"))
            .mockResolvedValue("eventual-success");

        const result = await retry.execute(operation, "test-op");

        expect(result).toBe("eventual-success");
        expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should throw after exhausting all retries", async () => {
        const operation = vi.fn().mockRejectedValue(new Error("network error"));

        await expect(retry.execute(operation, "test-op")).rejects.toThrow("network error");
        expect(operation).toHaveBeenCalledTimes(4); // initial + 3 retries
    });

    it("should not retry on non-retryable errors", async () => {
        const operation = vi.fn().mockRejectedValue(new Error("invalid signature"));

        await expect(retry.execute(operation, "test-op")).rejects.toThrow("invalid signature");
        expect(operation).toHaveBeenCalledTimes(1); // no retries
    });

    it("should retry on rate limit (429) errors", async () => {
        const operation = vi.fn()
            .mockRejectedValueOnce(new Error("HTTP 429 Too Many Requests"))
            .mockResolvedValue("success");

        const result = await retry.execute(operation, "test-op");

        expect(result).toBe("success");
        expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should retry on 'nonce too low' errors", async () => {
        const operation = vi.fn()
            .mockRejectedValueOnce(new Error("nonce too low"))
            .mockResolvedValue("success");

        const result = await retry.execute(operation, "test-op");

        expect(result).toBe("success");
        expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should retry on 'already known' errors", async () => {
        const operation = vi.fn()
            .mockRejectedValueOnce(new Error("already known"))
            .mockResolvedValue("success");

        const result = await retry.execute(operation, "test-op");

        expect(result).toBe("success");
        expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should retry on 'replacement transaction underpriced' errors", async () => {
        const operation = vi.fn()
            .mockRejectedValueOnce(new Error("replacement transaction underpriced"))
            .mockResolvedValue("success");

        const result = await retry.execute(operation, "test-op");

        expect(result).toBe("success");
        expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should not retry on validation errors", async () => {
        const operation = vi.fn().mockRejectedValue(new Error("validation failed: invalid address"));

        await expect(retry.execute(operation, "test-op")).rejects.toThrow("validation failed");
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should use exponential backoff with jitter", async () => {
        const delays: number[] = [];
        const originalSleep = (retry as any).sleep;
        (retry as any).sleep = vi.fn((ms: number) => {
            delays.push(ms);
            return Promise.resolve();
        });

        const operation = vi.fn()
            .mockRejectedValueOnce(new Error("timeout"))
            .mockRejectedValueOnce(new Error("timeout"))
            .mockRejectedValueOnce(new Error("timeout"))
            .mockRejectedValueOnce(new Error("timeout"));

        await expect(retry.execute(operation, "test-op")).rejects.toThrow("timeout");

        // Should have 3 retry delays (attempts 1, 2, 3)
        expect(delays.length).toBe(3);
        // Each delay should be >= 0 (jitter can make it 0)
        for (const delay of delays) {
            expect(delay).toBeGreaterThanOrEqual(0);
            expect(delay).toBeLessThanOrEqual(100); // maxDelayMs
        }

        (retry as any).sleep = originalSleep;
    });

    it("should handle custom retry config", async () => {
        const customRetry = new RetryManager({
            maxRetries: 5,
            baseDelayMs: 50,
            maxDelayMs: 500,
            backoffMultiplier: 3,
        });

        const operation = vi.fn()
            .mockRejectedValueOnce(new Error("timeout"))
            .mockResolvedValue("success");

        const result = await customRetry.execute(operation, "custom-op");

        expect(result).toBe("success");
        expect(operation).toHaveBeenCalledTimes(2);
    });
});