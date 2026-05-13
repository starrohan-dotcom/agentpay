import { describe, it, expect, vi, beforeEach } from "vitest";
import { CircuitBreaker } from "../../src/utils/circuit-breaker.js";
import { CircuitState } from "../../src/utils/types.js";

describe("CircuitBreaker", () => {
    let cb: CircuitBreaker;

    beforeEach(() => {
        cb = new CircuitBreaker({
            failureThreshold: 3,
            resetTimeoutMs: 100,
            halfOpenMaxRequests: 2,
        });
    });

    it("should start in CLOSED state", () => {
        expect(cb.getState()).toBe(CircuitState.CLOSED);
    });

    it("should execute successful operations in CLOSED state", async () => {
        const operation = vi.fn().mockResolvedValue("success");

        const result = await cb.execute(operation);

        expect(result).toBe("success");
        expect(cb.getState()).toBe(CircuitState.CLOSED);
    });

    it("should open circuit after reaching failure threshold", async () => {
        const failingOp = vi.fn().mockRejectedValue(new Error("RPC down"));

        for (let i = 0; i < 3; i++) {
            await expect(cb.execute(failingOp)).rejects.toThrow("RPC down");
        }

        expect(cb.getState()).toBe(CircuitState.OPEN);
    });

    it("should reject requests when circuit is OPEN", async () => {
        // Trip the circuit
        const failingOp = vi.fn().mockRejectedValue(new Error("RPC down"));
        for (let i = 0; i < 3; i++) {
            await expect(cb.execute(failingOp)).rejects.toThrow("RPC down");
        }

        // Now circuit is OPEN
        const successOp = vi.fn().mockResolvedValue("should-not-be-called");
        await expect(cb.execute(successOp)).rejects.toThrow("Circuit breaker is OPEN");
        expect(successOp).not.toHaveBeenCalled();
    });

    it("should use fallback when circuit is OPEN", async () => {
        // Trip the circuit
        const failingOp = vi.fn().mockRejectedValue(new Error("RPC down"));
        for (let i = 0; i < 3; i++) {
            await expect(cb.execute(failingOp)).rejects.toThrow("RPC down");
        }

        const fallback = vi.fn().mockResolvedValue("fallback-value");
        const result = await cb.execute(vi.fn(), fallback);

        expect(result).toBe("fallback-value");
        expect(fallback).toHaveBeenCalledTimes(1);
    });

    it("should transition to HALF_OPEN after reset timeout", async () => {
        // Trip the circuit with short timeout
        const quickCb = new CircuitBreaker({
            failureThreshold: 2,
            resetTimeoutMs: 10,
            halfOpenMaxRequests: 2,
        });

        const failingOp = vi.fn().mockRejectedValue(new Error("RPC down"));
        for (let i = 0; i < 2; i++) {
            await expect(quickCb.execute(failingOp)).rejects.toThrow("RPC down");
        }
        expect(quickCb.getState()).toBe(CircuitState.OPEN);

        // Wait for reset timeout
        await new Promise((resolve) => setTimeout(resolve, 20));

        // Next request should transition to HALF_OPEN and succeed
        const successOp = vi.fn().mockResolvedValue("recovered");
        const result = await quickCb.execute(successOp);

        expect(result).toBe("recovered");
        expect(quickCb.getState()).toBe(CircuitState.CLOSED);
    });

    it("should go back to OPEN if HALF_OPEN request fails", async () => {
        const quickCb = new CircuitBreaker({
            failureThreshold: 2,
            resetTimeoutMs: 10,
            halfOpenMaxRequests: 2,
        });

        // Trip circuit
        const failingOp = vi.fn().mockRejectedValue(new Error("RPC down"));
        for (let i = 0; i < 2; i++) {
            await expect(quickCb.execute(failingOp)).rejects.toThrow("RPC down");
        }

        // Wait for reset
        await new Promise((resolve) => setTimeout(resolve, 20));

        // HALF_OPEN request fails
        await expect(quickCb.execute(failingOp)).rejects.toThrow("RPC down");

        // Should be OPEN again
        expect(quickCb.getState()).toBe(CircuitState.OPEN);
    });

    it("should limit HALF_OPEN concurrent requests", async () => {
        const quickCb = new CircuitBreaker({
            failureThreshold: 1,
            resetTimeoutMs: 10,
            halfOpenMaxRequests: 1,
        });

        // Trip circuit
        await expect(quickCb.execute(vi.fn().mockRejectedValue(new Error("fail")))).rejects.toThrow();

        // Wait for reset
        await new Promise((resolve) => setTimeout(resolve, 20));

        // First HALF_OPEN request - use a failing op so it goes back to OPEN
        // Then wait again and test the limit
        await expect(quickCb.execute(vi.fn().mockRejectedValue(new Error("still failing")))).rejects.toThrow();

        // Wait for another reset
        await new Promise((resolve) => setTimeout(resolve, 20));

        // Now in HALF_OPEN, first request consumes the slot
        // We need to make two concurrent-ish calls - the first one takes the slot
        // Since execute is async, we start one that hangs, then try another
        let resolver: (value: string) => void;
        const hangingPromise = new Promise<string>((resolve) => {
            resolver = resolve;
        });

        const hangingOp = vi.fn().mockReturnValue(hangingPromise);
        const firstResult = quickCb.execute(hangingOp);

        // Second request should be rejected (halfOpenMaxRequests = 1)
        await expect(quickCb.execute(vi.fn())).rejects.toThrow("HALF_OPEN limit reached");

        // Clean up: resolve the hanging promise
        resolver!("done");
        await firstResult;
    });

    it("should return correct metrics", () => {
        const metrics = cb.getMetrics();

        expect(metrics.state).toBe(CircuitState.CLOSED);
        expect(metrics.failureCount).toBe(0);
        expect(metrics.lastFailureTime).toBe(0);
    });

    it("should reset failure count on success in CLOSED state", async () => {
        // One failure
        await expect(cb.execute(vi.fn().mockRejectedValue(new Error("fail")))).rejects.toThrow();

        expect(cb.getMetrics().failureCount).toBe(1);

        // One success should reset
        await cb.execute(vi.fn().mockResolvedValue("ok"));

        expect(cb.getMetrics().failureCount).toBe(0);
    });
});