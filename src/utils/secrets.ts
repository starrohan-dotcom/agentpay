import { type SecretsProvider } from "./types.js";
import { AgentPayError, ErrorCode } from "./errors.js";
import { logger } from "./logger.js";

/**
 * Environment-variable-based secrets provider.
 *
 * Suitable for development and staging. For production, use
 * AwsKmsSecretsProvider or HashiCorpVaultSecretsProvider.
 */
export class EnvSecretsProvider implements SecretsProvider {
    private privateKeyEnvVar: string;

    constructor(privateKeyEnvVar: string = "AGENTPAY_PRIVATE_KEY") {
        this.privateKeyEnvVar = privateKeyEnvVar;
    }

    async getPrivateKey(): Promise<`0x${string}`> {
        const key = process.env[this.privateKeyEnvVar];
        if (!key) {
            throw new AgentPayError(
                ErrorCode.SECRETS_UNAVAILABLE,
                `Environment variable ${this.privateKeyEnvVar} is not set.`,
            );
        }

        // Validate format
        if (!/^0x[a-fA-F0-9]{64}$/.test(key)) {
            throw new AgentPayError(
                ErrorCode.INVALID_CONFIGURATION,
                `Private key in ${this.privateKeyEnvVar} is not a valid 32-byte hex string.`,
            );
        }

        return key as `0x${string}`;
    }

    async getSecret(name: string): Promise<string> {
        const value = process.env[name];
        if (!value) {
            throw new AgentPayError(
                ErrorCode.SECRETS_UNAVAILABLE,
                `Secret ${name} is not set in environment.`,
            );
        }
        return value;
    }

    async healthCheck(): Promise<boolean> {
        try {
            await this.getPrivateKey();
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Factory to create the appropriate secrets provider based on configuration.
 */
export function createSecretsProvider(): SecretsProvider {
    const provider = process.env.SECRETS_PROVIDER ?? "env";

    switch (provider) {
        case "env":
            logger.info("Using EnvSecretsProvider for key management");
            return new EnvSecretsProvider();

        // Future: AWS KMS, HashiCorp Vault, Azure Key Vault
        // case "aws-kms":
        //     return new AwsKmsSecretsProvider();
        // case "vault":
        //     return new HashiCorpVaultSecretsProvider();

        default:
            logger.warn(`Unknown secrets provider "${provider}", falling back to env`);
            return new EnvSecretsProvider();
    }
}