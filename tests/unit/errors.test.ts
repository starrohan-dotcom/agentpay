import { describe, it, expect } from "vitest";
import { AgentPayError, ErrorCode } from "../../src/utils/errors.js";

describe("AgentPayError", () => {
    it("should create an error with code and message", () => {
        const err = new AgentPayError(
            ErrorCode.POLICY_VIOLATION,
            "Transaction exceeds daily limit",
        );

        expect(err.code).toBe(ErrorCode.POLICY_VIOLATION);
        expect(err.message).toContain("[AgentPay]");
        expect(err.message).toContain("POLICY_VIOLATION");
        expect(err.name).toBe("AgentPayError");
    });

    it("should generate a correlation ID", () => {
        const err = new AgentPayError(
            ErrorCode.TRANSACTION_FAILED,
            "RPC error",
        );

        expect(err.correlationId).toBeDefined();
        expect(err.correlationId.length).toBeGreaterThan(0);
    });

    it("should accept a custom correlation ID", () => {
        const err = new AgentPayError(
            ErrorCode.TRANSACTION_FAILED,
            "RPC error",
            undefined,
            "custom-correlation-123",
        );

        expect(err.correlationId).toBe("custom-correlation-123");
    });

    it("should include a timestamp", () => {
        const err = new AgentPayError(
            ErrorCode.STORAGE_ERROR,
            "Failed to save",
        );

        expect(err.timestamp).toBeDefined();
        expect(() => new Date(err.timestamp)).not.toThrow();
    });

    it("should include details", () => {
        const err = new AgentPayError(
            ErrorCode.INVALID_CONFIGURATION,
            "Missing required field",
            { field: "privateKey" },
        );

        expect(err.details).toEqual({ field: "privateKey" });
    });

    it("should produce a standardized API response", () => {
        const err = new AgentPayError(
            ErrorCode.RATE_LIMIT_EXCEEDED,
            "Too many requests",
            { retryAfter: 30 },
            "corr-123",
        );

        const response = err.toApiResponse();

        expect(response.error.code).toBe("RATE_LIMIT_EXCEEDED");
        expect(response.error.message).toContain("Too many requests");
        expect(response.error.correlationId).toBe("corr-123");
        expect(response.error.timestamp).toBeDefined();
        expect(response.error.details).toEqual({ retryAfter: 30 });
    });

    it("should support all error codes", () => {
        const codes = Object.values(ErrorCode);
        for (const code of codes) {
            const err = new AgentPayError(code, "test");
            expect(err.code).toBe(code);
            expect(err.toApiResponse().error.code).toBe(code);
        }
    });
});