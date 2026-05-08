import { AgentWallet, policy } from "../src/index.js";
import { generatePrivateKey } from "viem/accounts";
import { parseEther } from "viem";
import fs from "fs";
import path from "path";

const STATE_FILE = path.join(process.cwd(), ".agentpay-state.json");

async function runTests() {
  console.log("--- Starting Policy Logic Tests (BigInt version) ---");

  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);

  const privateKey = generatePrivateKey();
  const target = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";

  // Test 1: Max Transaction Amount
  console.log("\nTest 1: Max Transaction Amount Policy");
  const agent1 = new AgentWallet({
    privateKey,
    policy: policy().maxTx(0.001).build(),
  });

  try {
    (agent1 as any).checkPolicy(target, parseEther("0.002"));
    console.log("❌ Test 1 Failed: Did not throw on maxTx violation");
  } catch (e: any) {
    if (e.message.includes("exceeds maxTxAmount")) {
      console.log("✅ Test 1 Passed: Threw correct error");
    } else {
      console.log("❌ Test 1 Failed: Threw wrong error", e.message);
    }
  }

  // Test 2: Daily Limit
  console.log("\nTest 2: Daily Limit Policy");
  const agent2 = new AgentWallet({
    privateKey,
    policy: policy().dailyLimit(0.005).build(),
  });

  try {
    (agent2 as any).dailySpent = parseEther("0.004");
    (agent2 as any).checkPolicy(target, parseEther("0.002"));
    console.log("❌ Test 2 Failed: Did not throw on dailyLimit violation");
  } catch (e: any) {
    if (e.message.includes("daily limit")) {
      console.log("✅ Test 2 Passed: Threw correct error");
    } else {
      console.log("❌ Test 2 Failed: Threw wrong error", e.message);
    }
  }

  // Test 3: Daily Limit Reset
  console.log("\nTest 3: Daily Limit Reset");
  const agent3 = new AgentWallet({
    privateKey,
    policy: policy().dailyLimit(0.005).build(),
  });

  (agent3 as any).dailySpent = parseEther("0.004");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 2); // 2 days ago
  (agent3 as any).dayStart = yesterday;

  try {
    (agent3 as any).checkPolicy(target, parseEther("0.002"));
    console.log("✅ Test 3 Passed: Daily limit reset correctly");
    if ((agent3 as any).dailySpent !== 0n) {
        console.log("❌ Test 3 Failed: dailySpent not reset to 0n");
    }
  } catch (e: any) {
    console.log("❌ Test 3 Failed: Threw error when it should have reset", e.message);
  }

  // Test 4: Allowlist
  console.log("\nTest 4: Allowlist Policy");
  const allowed = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";
  const agent4 = new AgentWallet({
    privateKey,
    policy: policy().allowOnly([allowed]).build(),
  });

  try {
    (agent4 as any).checkPolicy(allowed, parseEther("0.001"));
    console.log("✅ Test 4.1 Passed: Allowed address accepted");
  } catch (e: any) {
    console.log("❌ Test 4.1 Failed: Threw on allowed address", e.message);
  }

  try {
    (agent4 as any).checkPolicy("0x0000000000000000000000000000000000000000", parseEther("0.001"));
    console.log("❌ Test 4.2 Failed: Did not throw on unauthorized address");
  } catch (e: any) {
    if (e.message.includes("not in the allowed list")) {
      console.log("✅ Test 4.2 Passed: Threw correct error");
    } else {
      console.log("❌ Test 4.2 Failed: Threw wrong error", e.message);
    }
  }

  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
}

runTests().catch(console.error);
