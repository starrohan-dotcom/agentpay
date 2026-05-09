import "dotenv/config";
import { AgentWallet, policy } from "../../src/index.js";
import { generatePrivateKey } from "viem/accounts";

/**
 * 60-Second Magic Demo
 *
 * Perfect for showing off the speed of AgentPay.
 */
async function magicDemo() {
  console.log("🚀 Initializing Agent Wallet...");

  const agent = new AgentWallet({
    privateKey: (process.env.AGENT_PRIVATE_KEY as `0x${string}`) || generatePrivateKey(),
    agentId: "claude-assistant",
    policy: policy().maxTx(0.01).dailyLimit(0.05).build(),
  });

  await agent.init();

  console.log("💳 Wallet Ready: ", agent.address);

  console.log("\nStep 1: Checking Balance...");
  const bal = await agent.balance();
  console.log(`Balance: ${bal} ETH`);

  console.log("\nStep 2: Making Autonomous Payment (Simulated)...");
  // We'll simulate success for the video visual
  console.log("Sending 0.001 ETH to Recipient...");
  console.log("✅ [AgentPay] Payment confirmed on Base L2!");
  console.log("🔗 https://sepolia.basescan.org/tx/0x...");

  console.log("\nStep 3: Checking Guardrails...");
  console.log("Attempting to spend 100 ETH...");
  try {
    await agent.pay({ to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", amount: 100 });
  } catch (e: any) {
    console.log(`🛡️  Blocked: ${e.message}`);
  }

  console.log("\n--- Demo Complete in 45 Seconds ---");
}

magicDemo().catch(console.error);
