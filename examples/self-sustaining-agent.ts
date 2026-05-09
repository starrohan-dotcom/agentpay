/**
 * Self-Sustaining Agent Example
 *
 * In this example, the agent manages its own budget to pay for its LLM API costs.
 * It checks its balance before every request and stops if it's running low.
 */

import "dotenv/config";
import { AgentWallet, policy } from "../src/index.js";
import { generatePrivateKey } from "viem/accounts";

async function runSelfSustainingAgent() {
  // 1. Setup the agent with a budget
  const agent = new AgentWallet({
    privateKey: (process.env.AGENT_PRIVATE_KEY as `0x${string}`) || generatePrivateKey(),
    agentId: "openai-sustainer",
    policy: policy()
      .dailyLimit(0.01) // Max $30 worth of ETH/USDC per day
      .build(),
  });

  await agent.init();

  // 2. Simulated "Work" loop
  console.log("Agent started. Checking balance for API calls...");

  const balance = await agent.balance("USDC");
  console.log(`Current USDC Balance: ${balance}`);

  if (Number(balance) < 1.0) {
    console.log("⚠️ Balance low! Agent is requesting top-up from owner...");
    // In a real agent, this might send a Slack message or a transaction request
  } else {
    // 3. Perform work and pay for it
    console.log("Performing LLM request...");

    // Simulate paying for 1,000,000 tokens (e.g. $5.00)
    const tx = await agent.pay({
      to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", // Provider address
      amount: 5.0,
      token: "USDC",
      memo: "Payment for GPT-4o usage (1M tokens)",
    });

    console.log(`✅ Paid for work. Tx: ${tx.hash}`);
  }

  await agent.summary();
}

runSelfSustainingAgent().catch(console.error);
