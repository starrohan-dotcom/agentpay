import { type StorageProvider, type AgentState } from "./StorageProvider.js";
import { logger } from "../utils/logger.js";

/**
 * Redis-backed storage provider for production deployments.
 *
 * Requires a Redis client instance. Supports:
 * - Persistent state across restarts
 * - Atomic operations
 * - TTL-based automatic cleanup
 * - Connection pooling
 *
 * Usage:
 *   import { createClient } from "redis";
 *   const redis = createClient({ url: process.env.REDIS_URL });
 *   await redis.connect();
 *   const storage = new RedisStorage(redis);
 */
export class RedisStorage implements StorageProvider {
    private redis: any; // Redis client type - use `redis` package types in production
    private keyPrefix: string;
    private ttlSeconds: number;

    constructor(
        redisClient: any,
        options: { keyPrefix?: string; ttlSeconds?: number } = {},
    ) {
        this.redis = redisClient;
        this.keyPrefix = options.keyPrefix ?? "agentpay:state:";
        this.ttlSeconds = options.ttlSeconds ?? 86400 * 30; // 30 days default
    }

    private getKey(agentId: string): string {
        return `${this.keyPrefix}${agentId}`;
    }

    async load(agentId: string): Promise<AgentState | null> {
        try {
            const raw = await this.redis.get(this.getKey(agentId));
            if (!raw) return null;
            return JSON.parse(raw) as AgentState;
        } catch (err) {
            logger.error("RedisStorage: Failed to load state", {
                agentId,
                error: String(err),
            });
            return null;
        }
    }

    async save(agentId: string, state: AgentState): Promise<void> {
        try {
            const key = this.getKey(agentId);
            const value = JSON.stringify(state);
            await this.redis.set(key, value, { EX: this.ttlSeconds });
        } catch (err) {
            logger.error("RedisStorage: Failed to save state", {
                agentId,
                error: String(err),
            });
            throw err;
        }
    }

    /**
     * Deletes the state for a specific agent.
     */
    async delete(agentId: string): Promise<void> {
        try {
            await this.redis.del(this.getKey(agentId));
        } catch (err) {
            logger.error("RedisStorage: Failed to delete state", {
                agentId,
                error: String(err),
            });
        }
    }

    /**
     * Checks if state exists for an agent.
     */
    async exists(agentId: string): Promise<boolean> {
        try {
            const result = await this.redis.exists(this.getKey(agentId));
            return result === 1;
        } catch {
            return false;
        }
    }
}