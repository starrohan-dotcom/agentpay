import { type TxRecord } from "../AgentWallet.js";

export interface AgentState {
  dailySpent: string; // BigInt as string
  dailySpentUSDC: string; // BigInt as string
  dayStart: string; // Date as ISO string
  txHistory: TxRecord[];
}

export interface StorageProvider {
  load(agentId: string): Promise<AgentState | null>;
  save(agentId: string, state: AgentState): Promise<void>;
}
