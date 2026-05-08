import { AgentWallet, policy } from "../src/index.js";
import { generatePrivateKey } from "viem/accounts";
import { parseEther } from "viem";
import fs from "fs";
import path from "path";

async function testUSDCLogic() {
  console.log("--- Testing USDC Policy Logic ---");

  const agentId = "usdc-agent-" + Math.random().toString(36).substring(7);
  const privateKey = generatePrivateKey();
  const target = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";

  const agent = new AgentWallet({
    privateKey,
    agentId,
    policy: policy().maxTx(10).dailyLimit(50).build(),
  });

  await agent.init();

  console.log("Test: USDC Max Transaction (Limit 10)");
  try {
    // 11 USDC = 11,000,000 base units
    await (agent as any).checkPolicy(target, BigInt(11000000), "USDC");
    console.log("❌ Failed: Allowed 11 USDC with limit 10");
  } catch (e: any) {
    console.log("✅ Success: Blocked 11 USDC transaction:", e.message);
  }

  console.log("\nTest: USDC Daily Limit (Limit 50)");
  (agent as any).dailySpentUSDC = BigInt(45000000); // 45 USDC
  try {
    await (agent as any).checkPolicy(target, BigInt(6000000), "USDC"); // 6 USDC
    console.log("❌ Failed: Allowed total 51 USDC with limit 50");
  } catch (e: any) {
    console.log("✅ Success: Blocked daily limit breach (51 USDC):", e.message);
  }

  // Cleanup
  const stateFile = path.join(process.cwd(), `.agentpay-state-${agentId}.json`);
  if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
}

testUSDCLogic().catch(console.error);
