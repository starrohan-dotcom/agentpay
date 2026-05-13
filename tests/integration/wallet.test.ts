import { describe, it, expect, beforeEach } from "vitest";
import { AgentWallet, policy } from "../../src/index.js";
import { generatePrivateKey } from "viem/accounts";
import { parseEther } from "viem";
import { AgentPayError, ErrorCode } from "../../src/utils/errors.js";

describe("AgentWallet Integration", () => {
    let privateKey: `0x${string}`;
    const target = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";

    beforeEach(() => {
        privateKey = generatePrivateKey();
    });

    describe("Construction & Initialization", () => {
        it("should construct with valid config", () => {
            const wallet = new AgentWallet({ privateKey });

            expect(wallet.address).toBeDefined();
            expect(wallet.address.startsWith("0x")).toBe(true);
            expect(wallet.agentId).toBeDefined();
        });

        it("should generate agentId from address if not provided", () => {
            const wallet = new AgentWallet({ privateKey });

            expect(wallet.agentId).toContain("agent-");
        });

        it("should use provided agentId", () => {
            const wallet = new AgentWallet({
                privateKey,
                agentId: "custom-agent",
            });

            expect(wallet.agentId).toBe("custom-agent");
        });

        it("should initialize successfully", async () => {
            const wallet = new AgentWallet({ privateKey });

            await wallet.init();

            expect(wallet.getIsInitialized()).toBe(true);
        });

        it("should not re-initialize if already initialized", async () => {
            const wallet = new AgentWallet({ privateKey });
            await wallet.init();
            await wallet.init(); // second call should be no-op

            expect(wallet.getIsInitialized()).toBe(true);
        });
    });

    describe("Policy Enforcement", () => {
        it("should enforce maxTxAmount policy", async () => {
            const wallet = new AgentWallet({
                privateKey,
                policy: policy().maxTx(0.001).build(),
            });
            await wallet.init();

            // Access policy engine for direct testing
            const engine = (wallet as any).policyEngine;

            expect(() =>
                engine.validate(target, parseEther("0.002"), "ETH", 0n, 0n),
            ).toThrow(/exceeds maxTxAmount/);
        });

        it("should enforce dailyLimit policy", async () => {
            const wallet = new AgentWallet({
                privateKey,
                policy: policy().dailyLimit(0.01).build(),
            });
            await wallet.init();

            const engine = (wallet as any).policyEngine;

            expect(() =>
                engine.validate(target, parseEther("0.005"), "ETH", parseEther("0.008"), 0n),
            ).toThrow(/Daily limit/);
        });

        it("should enforce allowlist policy", async () => {
            const wallet = new AgentWallet({
                privateKey,
                policy: policy().allowOnly([target]).build(),
            });
            await wallet.init();

            const engine = (wallet as any).policyEngine;

            // Allowed address should pass
            expect(() =>
                engine.validate(target, parseEther("0.0001"), "ETH", 0n, 0n),
            ).not.toThrow();

            // Blocked address should fail
            expect(() =>
                engine.validate(
                    "0x0000000000000000000000000000000000000000",
                    parseEther("0.0001"),
                    "ETH",
                    0n,
                    0n,
                ),
            ).toThrow(/not in the allowed list/);
        });

        it("should enforce USDC maxTxAmount", async () => {
            const wallet = new AgentWallet({
                privateKey,
                policy: policy().maxTx(10).build(),
            });
            await wallet.init();

            const engine = (wallet as any).policyEngine;

            // 11 USDC should fail
            expect(() =>
                engine.validate(target, BigInt(11_000_000), "USDC", 0n, 0n),
            ).toThrow(/exceeds maxTxAmount/);

            // 5 USDC should pass
            expect(() =>
                engine.validate(target, BigInt(5_000_000), "USDC", 0n, 0n),
            ).not.toThrow();
        });
    });

    describe("Payment Validation", () => {
        it("should throw if pay() called before init()", async () => {
            const wallet = new AgentWallet({ privateKey });

            await expect(
                wallet.pay({ to: target, amount: 0.001 }),
            ).rejects.toThrow(/Must call .init()/);
        });

        it("should reject payments exceeding policy", async () => {
            const wallet = new AgentWallet({
                privateKey,
                policy: policy().maxTx(0.0001).build(),
            });
            await wallet.init();

            await expect(
                wallet.pay({ to: target, amount: 0.001 }),
            ).rejects.toThrow();
        });
    });

    describe("Balance & Info", () => {
        it("should return chain ID", () => {
            const wallet = new AgentWallet({ privateKey });

            const chainId = wallet.getChainId();
            expect(chainId).toBe(84532); // Base Sepolia default
        });

        it("should return policy", () => {
            const testPolicy = policy().maxTx(0.1).dailyLimit(1.0).build();
            const wallet = new AgentWallet({
                privateKey,
                policy: testPolicy,
            });

            const returnedPolicy = wallet.getPolicy();
            expect(returnedPolicy.maxTxAmount).toBe(0.1);
            expect(returnedPolicy.dailyLimit).toBe(1.0);
        });

        it("should return empty policy when none set", () => {
            const wallet = new AgentWallet({ privateKey });

            expect(wallet.getPolicy()).toEqual({});
        });

        it("should return empty history initially", () => {
            const wallet = new AgentWallet({ privateKey });

            expect(wallet.history()).toEqual([]);
        });

        it("should report smart account status", () => {
            const wallet = new AgentWallet({ privateKey });

            expect(wallet.getIsSmartAccount()).toBe(false);
        });
    });

    describe("Error Handling", () => {
        it("should produce standardized API error responses", () => {
            const err = new AgentPayError(
                ErrorCode.POLICY_VIOLATION,
                "Test violation",
            );

            const response = err.toApiResponse();
            expect(response.error.code).toBe("POLICY_VIOLATION");
            expect(response.error.correlationId).toBeDefined();
            expect(response.error.timestamp).toBeDefined();
        });
    });

    describe("Daily Reset", () => {
        it("should track daily spent correctly", () => {
            const wallet = new AgentWallet({ privateKey });

            const spent = wallet.dailySpentSoFar("ETH");
            expect(spent).toBe("0");
        });
    });
});