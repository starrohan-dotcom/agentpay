import { AgentWallet, policy } from "../src/index.js";
import { generatePrivateKey } from "viem/accounts";

async function testRestartVulnerability() {
  console.log("--- Testing Restart Vulnerability ---");

  const privateKey = generatePrivateKey();
  const target = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";
  const limit = 0.01;

  // Session 1
  console.log("Session 1: Agent starts, spends 0.008");
  const agent1 = new AgentWallet({
    privateKey,
    policy: policy().dailyLimit(limit).build(),
  });

  // Mocking a successful payment by manually updating dailySpent (since we don't want to actually send tx)
  (agent1 as any).dailySpent += 0.008;
  console.log(`Spent today: ${(agent1 as any).dailySpent}`);

  // Try to spend another 0.005 -> should fail
  try {
    (agent1 as any).checkPolicy(target, 0.005);
    console.log("❌ Failed: Session 1 allowed exceeding limit");
  } catch (e) {
    console.log("✅ Session 1 correctly blocked exceeding limit");
  }

  // Session 2: Agent restarts
  console.log("\nSession 2: Agent restarts (new instance)");
  const agent2 = new AgentWallet({
    privateKey,
    policy: policy().dailyLimit(limit).build(),
  });

  console.log(`Spent today: ${(agent2 as any).dailySpent}`);
  try {
    (agent2 as any).checkPolicy(target, 0.005);
    console.log("❌ Vulnerability Confirmed: Session 2 allowed payment that should be blocked by daily limit");
  } catch (e) {
    console.log("✅ Session 2 blocked payment (Unexpected if vulnerable)");
  }
}

testRestartVulnerability().catch(console.error);
