import fs from "fs";
import path from "path";
import { type StorageProvider, type AgentState } from "./StorageProvider.js";

export class FileStorage implements StorageProvider {
  private getPath(agentId: string): string {
    return path.join(process.cwd(), `.agentpay-state-${agentId}.json`);
  }

  async load(agentId: string): Promise<AgentState | null> {
    const filePath = this.getPath(agentId);
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn(`[AgentPay] FileStorage: Could not load state for ${agentId}:`, err);
    }
    return null;
  }

  async save(agentId: string, state: AgentState): Promise<void> {
    const filePath = this.getPath(agentId);
    try {
      fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
    } catch (err) {
      console.error(`[AgentPay] FileStorage: Failed to save state for ${agentId}:`, err);
    }
  }
}
