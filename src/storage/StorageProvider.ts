import { type TxRecord } from "../AgentWallet.js";

/**
 * Represents the current spending and metadata state of an agent.
 */
export interface AgentState {
  /** Total ETH spent today (in Wei, as a string) */
  dailySpent: string;
  /** Total USDC spent today (in base units, as a string) */
  dailySpentUSDC: string;
  /** The ISO timestamp when the current spending day started */
  dayStart: string;
  /** A history of all successful and failed transactions */
  txHistory: TxRecord[];
}

/**
 * Interface for pluggable storage backends to persist agent state.
 */
export interface StorageProvider {
  /**
   * Load the state for a specific agent.
   * @param agentId The unique identifier for the agent.
   * @returns The agent's state or null if no state exists.
   */
  load(agentId: string): Promise<AgentState | null>;

  /**
   * Save the state for a specific agent.
   * @param agentId The unique identifier for the agent.
   * @param state The state object to persist.
   */
  save(agentId: string, state: AgentState): Promise<void>;
}
