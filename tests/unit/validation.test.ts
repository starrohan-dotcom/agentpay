import { describe, it, expect } from "vitest";
import {
    WalletConfigSchema,
    PayOptionsSchema,
    SpendingPolicySchema,
} from "../../src/utils/validation.js";

describe("SpendingPolicySchema", () => {
    it("should accept an empty policy", () => {
        const result = SpendingPolicySchema.safeParse({});
        expect(result.success).toBe(true);
    });

    it("should accept a full policy", () => {
        const result = SpendingPolicySchema.safeParse({
            maxTxAmount: 0.1,
            dailyLimit: 1.0,
            allowedAddresses: ["0x71C7656EC7ab88b098defB751B7401B5f6d8976F"],
            requireLogAbove: 0.5,
        });
        expect(result.success).toBe(true);
    });

    it("should reject invalid addresses in allowlist", () => {
        const result = SpendingPolicySchema.safeParse({
            allowedAddresses: ["not-an-address"],
        });
        expect(result.success).toBe(false);
    });

    it("should accept numbers for limits", () => {
        const result = SpendingPolicySchema.safeParse({
            maxTxAmount: 100,
            dailyLimit: 1000,
        });
        expect(result.success).toBe(true);
    });
});

describe("WalletConfigSchema", () => {
    const validPrivateKey = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    it("should accept a valid config", () => {
        const result = WalletConfigSchema.safeParse({
            privateKey: validPrivateKey,
        });
        expect(result.success).toBe(true);
    });

    it("should reject missing private key", () => {
        const result = WalletConfigSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    it("should reject invalid private key format", () => {
        const result = WalletConfigSchema.safeParse({
            privateKey: "not-a-key",
        });
        expect(result.success).toBe(false);
    });

    it("should accept optional fields", () => {
        const result = WalletConfigSchema.safeParse({
            privateKey: validPrivateKey,
            agentId: "my-agent",
            rpcUrl: "https://mainnet.base.org",
            useSmartAccount: true,
            bundlerUrl: "https://bundler.example.com",
        });
        expect(result.success).toBe(true);
    });

    it("should reject invalid RPC URL", () => {
        const result = WalletConfigSchema.safeParse({
            privateKey: validPrivateKey,
            rpcUrl: "not-a-url",
        });
        expect(result.success).toBe(false);
    });
});

describe("PayOptionsSchema", () => {
    it("should accept valid payment options", () => {
        const result = PayOptionsSchema.safeParse({
            to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            amount: 0.1,
        });
        expect(result.success).toBe(true);
    });

    it("should default token to ETH", () => {
        const result = PayOptionsSchema.parse({
            to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            amount: 0.1,
        });
        expect(result.token).toBe("ETH");
    });

    it("should accept USDC token", () => {
        const result = PayOptionsSchema.safeParse({
            to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            amount: 10,
            token: "USDC",
        });
        expect(result.success).toBe(true);
    });

    it("should reject invalid token", () => {
        const result = PayOptionsSchema.safeParse({
            to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            amount: 10,
            token: "BTC",
        });
        expect(result.success).toBe(false);
    });

    it("should reject negative amounts", () => {
        const result = PayOptionsSchema.safeParse({
            to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            amount: -1,
        });
        expect(result.success).toBe(false);
    });

    it("should reject zero amount", () => {
        const result = PayOptionsSchema.safeParse({
            to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            amount: 0,
        });
        expect(result.success).toBe(false);
    });

    it("should reject invalid address", () => {
        const result = PayOptionsSchema.safeParse({
            to: "not-an-address",
            amount: 0.1,
        });
        expect(result.success).toBe(false);
    });

    it("should accept optional memo and idempotency key", () => {
        const result = PayOptionsSchema.safeParse({
            to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            amount: 0.1,
            memo: "test payment",
            idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
        });
        expect(result.success).toBe(true);
    });

    it("should reject invalid UUID for idempotency key", () => {
        const result = PayOptionsSchema.safeParse({
            to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            amount: 0.1,
            idempotencyKey: "not-a-uuid",
        });
        expect(result.success).toBe(false);
    });
});