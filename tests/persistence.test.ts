import { AgentWallet, policy } from "../src/index.js";
import { generatePrivateKey } from "viem/accounts";
import { parseEther } from "viem";
import fs from "fs";
import path from "path";

async function testPersistence() {
  console.log("--- Testing Persistence Fix ---");

  const agentId = "test-agent-" + Math.random().toString(36).substring(7);
  const stateFile = path.join(process.cwd(), `.agentpay-state-${agentId}.json`);
  if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);

  const privateKey = generatePrivateKey();
  const target = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";
  const limit = 0.01;

  // Session 1: Spend some
  console.log(`Session 1: Agent ${agentId} starts, spends 0.008 ETH`);
  const agent1 = new AgentWallet({
    privateKey,
    agentId,
    policy: policy().dailyLimit(limit).build(),
  });

  (agent1 as any).dailySpent = parseEther("0.008");
  (agent1 as any).saveState();
  console.log(`Spent today: ${(agent1 as any).dailySpentSoFar()} ETH`);

  // Session 2: Agent restarts
  console.log("\nSession 2: Agent restarts (new instance)");
  const agent2 = new AgentWallet({
    privateKey,
    agentId,
    policy: policy().dailyLimit(limit).build(),
  });

  console.log(`Spent today: ${(agent2 as any).dailySpentSoFar()} ETH`);

  try {
    (agent2 as any).checkPolicy(target, parseEther("0.005"));
    console.log("❌ Failed: Session 2 allowed payment (Persistence bug)");
  } catch (e: any) {
    if (e.message.includes("daily limit")) {
        console.log("✅ Success: Session 2 correctly blocked payment due to persisted state");
    } else {
        console.log("❌ Failed: Threw wrong error", e.message);
    }
  }

  // Session 3: Collision Check
  console.log("\nSession 3: New Agent ID check (Collision prevention)");
  const agentId2 = agentId + "-2";
  const agent3 = new AgentWallet({
    privateKey,
    agentId: agentId2,
    policy: policy().dailyLimit(limit).build(),
  });
  console.log(`Agent ${agentId2} spent today: ${(agent3 as any).dailySpentSoFar()} ETH`);
  if ((agent3 as any).dailySpent === 0n) {
      console.log("✅ Success: New agent started with 0 spend");
  } else {
      console.log("❌ Failed: New agent inherited spend from another agent (Collision)");
  }

  // Cleanup
  if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
  const stateFile2 = path.join(process.cwd(), `.agentpay-state-${agentId2}.json`);
  if (fs.existsSync(stateFile2)) fs.unlinkSync(stateFile2);
}

testPersistence().catch(console.error);
