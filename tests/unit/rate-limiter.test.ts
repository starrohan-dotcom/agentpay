import { describe, it, expect, beforeEach } from "vitest";
import { RateLimiter } from "../../src/utils/rate-limiter.js";

describe("RateLimiter", () => {
    let limiter: RateLimiter;

    beforeEach(() => {
        limiter = new RateLimiter("test-limiter", {
            maxTokens: 10,
            refillRate: 100, // 100 tokens/sec for fast tests
        });
    });

    it("should allow consumption when tokens are available", () => {
        expect(limiter.tryConsume()).toBe(true);
        expect(limiter.availableTokens()).toBeCloseTo(9, 0);
    });

    it("should block consumption when tokens are exhausted", () => {
        // Consume all 10 tokens
        for (let i = 0; i < 10; i++) {
            expect(limiter.tryConsume()).toBe(true);
        }

        // 11th should fail
        expect(limiter.tryConsume()).toBe(false);
    });

    it("should refill tokens over time", async () => {
        // Consume all tokens
        for (let i = 0; i < 10; i++) {
            limiter.tryConsume();
        }

        expect(limiter.availableTokens()).toBeLessThan(0.1);

        // Wait for refill (100 tokens/sec, so 50ms = 5 tokens)
        await new Promise((resolve) => setTimeout(resolve, 50));

        const available = limiter.availableTokens();
        expect(available).toBeGreaterThan(0);
        expect(available).toBeLessThanOrEqual(10); // capped at maxTokens
    });

    it("should not exceed maxTokens on refill", async () => {
        // Wait long enough that refill would exceed max
        await new Promise((resolve) => setTimeout(resolve, 200));

        expect(limiter.availableTokens()).toBe(10); // capped
    });

    it("should reset to full capacity", () => {
        // Consume some tokens
        limiter.tryConsume();
        limiter.tryConsume();
        expect(limiter.availableTokens()).toBe(8);

        limiter.reset();
        expect(limiter.availableTokens()).toBe(10);
    });

    it("should support custom token consumption amounts", () => {
        const customLimiter = new RateLimiter("custom", {
            maxTokens: 100,
            refillRate: 10,
        });

        expect(customLimiter.tryConsume(50)).toBe(true);
        expect(customLimiter.availableTokens()).toBe(50);

        expect(customLimiter.tryConsume(60)).toBe(false); // not enough
        expect(customLimiter.availableTokens()).toBeCloseTo(50, 0); // unchanged
    });

    it("should handle multiple rapid consumes correctly", () => {
        let successCount = 0;
        for (let i = 0; i < 20; i++) {
            if (limiter.tryConsume()) successCount++;
        }

        expect(successCount).toBe(10); // maxTokens = 10
    });
});