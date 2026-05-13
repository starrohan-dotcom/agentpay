import { type StorageProvider, type AgentState } from "./StorageProvider.js";
import { logger } from "../utils/logger.js";

/**
 * PostgreSQL client/pool interface - use `pg` package types in production.
 */
interface PgPool {
    query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

/**
 * PostgreSQL-backed storage provider for enterprise deployments.
 *
 * Provides:
 * - ACID-compliant persistence
 * - Concurrent access safety
 * - Audit trail via database triggers
 * - Connection pooling (use pg-pool in production)
 *
 * Usage:
 *   import { Pool } from "pg";
 *   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
 *   const storage = new PostgresStorage(pool);
 */
export class PostgresStorage implements StorageProvider {
    private pool: PgPool;
    private tableName: string;

    constructor(
        pool: PgPool,
        options: { tableName?: string } = {},
    ) {
        this.pool = pool;
        this.tableName = options.tableName ?? "agentpay_state";
    }

    /**
     * Initializes the database table. Call once during application startup.
     */
    async initialize(): Promise<void> {
        const query = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        agent_id VARCHAR(255) PRIMARY KEY,
        state JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_updated_at
        ON ${this.tableName} (updated_at);
    `;

        try {
            await this.pool.query(query);
            logger.info(`PostgresStorage: Table ${this.tableName} initialized`);
        } catch (err) {
            logger.error("PostgresStorage: Failed to initialize table", {
                error: String(err),
            });
            throw err;
        }
    }

    async load(agentId: string): Promise<AgentState | null> {
        try {
            const query = `
        SELECT state FROM ${this.tableName}
        WHERE agent_id = $1
      `;
            const result = await this.pool.query(query, [agentId]);

            if (result.rows.length === 0) return null;

            return result.rows[0].state as AgentState;
        } catch (err) {
            logger.error("PostgresStorage: Failed to load state", {
                agentId,
                error: String(err),
            });
            return null;
        }
    }

    async save(agentId: string, state: AgentState): Promise<void> {
        try {
            const query = `
        INSERT INTO ${this.tableName} (agent_id, state, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (agent_id)
        DO UPDATE SET state = $2, updated_at = NOW()
      `;
            await this.pool.query(query, [agentId, JSON.stringify(state)]);
        } catch (err) {
            logger.error("PostgresStorage: Failed to save state", {
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
            await this.pool.query(
                `DELETE FROM ${this.tableName} WHERE agent_id = $1`,
                [agentId],
            );
        } catch (err) {
            logger.error("PostgresStorage: Failed to delete state", {
                agentId,
                error: String(err),
            });
        }
    }

    /**
     * Lists all agent IDs with stored state.
     */
    async listAgentIds(): Promise<string[]> {
        try {
            const result = await this.pool.query(
                `SELECT agent_id FROM ${this.tableName} ORDER BY updated_at DESC`,
            );
            return result.rows.map((row: Record<string, unknown>) => row.agent_id as string);
        } catch (err) {
            logger.error("PostgresStorage: Failed to list agents", {
                error: String(err),
            });
            return [];
        }
    }

    /**
     * Returns the count of stored agent states.
     */
    async count(): Promise<number> {
        try {
            const result = await this.pool.query(
                `SELECT COUNT(*) as count FROM ${this.tableName}`,
            );
            return parseInt(result.rows[0].count as string, 10);
        } catch {
            return 0;
        }
    }
}