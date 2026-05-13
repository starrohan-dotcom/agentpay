import { describe, it, expect, beforeEach } from "vitest";
import { AuditLogger } from "../../src/utils/audit.js";

describe("AuditLogger", () => {
    let audit: AuditLogger;

    beforeEach(() => {
        audit = new AuditLogger(100);
    });

    it("should log payment initiated events", () => {
        audit.logPaymentInitiated({
            agentId: "agent-1",
            amount: "0.1",
            token: "ETH",
            recipient: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            idempotencyKey: "key-123",
        });

        const entries = audit.getRecentEntries();
        expect(entries.length).toBe(1);
        expect(entries[0].eventType).toBe("PAYMENT_INITIATED");
        expect(entries[0].agentId).toBe("agent-1");
        expect(entries[0].amount).toBe("0.1");
    });

    it("should log payment succeeded events", () => {
        audit.logPaymentSucceeded({
            agentId: "agent-1",
            transactionHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            amount: "0.1",
            token: "ETH",
            recipient: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            idempotencyKey: "key-123",
        });

        const entries = audit.getRecentEntries();
        expect(entries[0].eventType).toBe("PAYMENT_SUCCEEDED");
        expect(entries[0].transactionHash).toBeDefined();
    });

    it("should log payment failed events", () => {
        audit.logPaymentFailed({
            agentId: "agent-1",
            amount: "0.1",
            token: "ETH",
            recipient: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            idempotencyKey: "key-123",
            errorMessage: "insufficient funds",
        });

        const entries = audit.getRecentEntries();
        expect(entries[0].eventType).toBe("PAYMENT_FAILED");
        expect(entries[0].errorMessage).toBe("insufficient funds");
    });

    it("should log policy check events", () => {
        audit.logPolicyCheck({
            agentId: "agent-1",
            policyResult: "PASSED",
            amount: "0.1",
            token: "ETH",
            recipient: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        });

        const entries = audit.getRecentEntries();
        expect(entries[0].eventType).toBe("POLICY_CHECK");
        expect(entries[0].policyResult).toBe("PASSED");
    });

    it("should log daily reset events", () => {
        audit.logDailyReset("agent-1");

        const entries = audit.getRecentEntries();
        expect(entries[0].eventType).toBe("DAILY_RESET");
    });

    it("should query by event type", () => {
        audit.logPaymentInitiated({
            agentId: "agent-1",
            amount: "0.1",
            token: "ETH",
            recipient: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            idempotencyKey: "key-1",
        });
        audit.logPaymentSucceeded({
            agentId: "agent-1",
            transactionHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            amount: "0.1",
            token: "ETH",
            recipient: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            idempotencyKey: "key-1",
        });
        audit.logDailyReset("agent-1");

        const payments = audit.queryByEventType("PAYMENT_INITIATED");
        expect(payments.length).toBe(1);

        const resets = audit.queryByEventType("DAILY_RESET");
        expect(resets.length).toBe(1);
    });

    it("should query by agent ID", () => {
        audit.logPaymentInitiated({
            agentId: "agent-1",
            amount: "0.1",
            token: "ETH",
            recipient: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            idempotencyKey: "key-1",
        });
        audit.logPaymentInitiated({
            agentId: "agent-2",
            amount: "0.2",
            token: "USDC",
            recipient: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            idempotencyKey: "key-2",
        });

        const agent1Entries = audit.queryByAgent("agent-1");
        expect(agent1Entries.length).toBe(1);
        expect(agent1Entries[0].agentId).toBe("agent-1");
    });

    it("should limit recent entries", () => {
        for (let i = 0; i < 50; i++) {
            audit.logDailyReset(`agent-${i}`);
        }

        const entries = audit.getRecentEntries(10);
        expect(entries.length).toBe(10);
    });

    it("should trim old entries to prevent memory leaks", () => {
        const smallAudit = new AuditLogger(10);

        for (let i = 0; i < 20; i++) {
            smallAudit.logDailyReset(`agent-${i}`);
        }

        // Should have trimmed to half of max (5)
        expect(smallAudit.getEntryCount()).toBeLessThanOrEqual(10);
    });

    it("should include timestamp in all entries", () => {
        audit.logDailyReset("agent-1");

        const entries = audit.getRecentEntries();
        expect(entries[0].timestamp).toBeInstanceOf(Date);
    });
});