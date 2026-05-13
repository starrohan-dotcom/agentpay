import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EnvSecretsProvider } from "../../src/utils/secrets.js";

describe("EnvSecretsProvider", () => {
    const validKey = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

    beforeEach(() => {
        process.env.AGENTPAY_PRIVATE_KEY = validKey;
        process.env.TEST_SECRET = "test-value";
    });

    afterEach(() => {
        delete process.env.AGENTPAY_PRIVATE_KEY;
        delete process.env.TEST_SECRET;
    });

    it("should retrieve private key from environment", async () => {
        const provider = new EnvSecretsProvider();
        const key = await provider.getPrivateKey();

        expect(key).toBe(validKey);
    });

    it("should throw when private key is not set", async () => {
        delete process.env.AGENTPAY_PRIVATE_KEY;

        const provider = new EnvSecretsProvider();
        await expect(provider.getPrivateKey()).rejects.toThrow("AGENTPAY_PRIVATE_KEY is not set");
    });

    it("should throw when private key format is invalid", async () => {
        process.env.AGENTPAY_PRIVATE_KEY = "not-a-key";

        const provider = new EnvSecretsProvider();
        await expect(provider.getPrivateKey()).rejects.toThrow("not a valid 32-byte hex string");
    });

    it("should retrieve arbitrary secrets", async () => {
        const provider = new EnvSecretsProvider();
        const secret = await provider.getSecret("TEST_SECRET");

        expect(secret).toBe("test-value");
    });

    it("should throw when secret is not set", async () => {
        const provider = new EnvSecretsProvider();
        await expect(provider.getSecret("NONEXISTENT_SECRET")).rejects.toThrow("not set in environment");
    });

    it("should report healthy when key is available", async () => {
        const provider = new EnvSecretsProvider();
        const healthy = await provider.healthCheck();

        expect(healthy).toBe(true);
    });

    it("should report unhealthy when key is missing", async () => {
        delete process.env.AGENTPAY_PRIVATE_KEY;

        const provider = new EnvSecretsProvider();
        const healthy = await provider.healthCheck();

        expect(healthy).toBe(false);
    });

    it("should support custom env var name", async () => {
        process.env.CUSTOM_KEY = validKey;

        const provider = new EnvSecretsProvider("CUSTOM_KEY");
        const key = await provider.getPrivateKey();

        expect(key).toBe(validKey);

        delete process.env.CUSTOM_KEY;
    });
});