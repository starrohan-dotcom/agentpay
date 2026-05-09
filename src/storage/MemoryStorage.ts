import { type AgentState, type StorageProvider } from "./StorageProvider.js";

/**
 * MemoryStorage
 *
 * Production-grade in-memory storage for ephemeral agents.
 */
export class MemoryStorage implements StorageProvider {
  private cache = new Map<string, AgentState>();

  async load(agentId: string): Promise<AgentState | null> {
    return this.cache.get(agentId) || null;
  }

  async save(agentId: string, state: AgentState): Promise<void> {
    this.cache.set(agentId, state);
  }
}
