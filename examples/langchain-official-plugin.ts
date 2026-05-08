/**
 * LangChain Official Plugin Example
 *
 * This example shows how to use the built-in LangChain tool provided by AgentPay.
 */

import "dotenv/config";
import { AgentWallet, AgentPayTool } from "../src/index.js";
import { generatePrivateKey } from "viem/accounts";

async function main() {
  // 1. Setup your agent wallet
  const agent = new AgentWallet({
    privateKey: (process.env.AGENT_PRIVATE_KEY as `0x${string}`) || generatePrivateKey(),
    agentId: "langchain-agent-01"
  });

  await agent.init();

  // 2. Create the LangChain tool
  const tool = new AgentPayTool(agent);

  console.log("--- Tool Metadata ---");
  console.log("Name:", tool.name);
  console.log("Description:", tool.description);

  // 3. Simulate an LLM call to check balance
  console.log("\n--- Simulating Balance Check ---");
  const balResult = await (tool as any)._call(JSON.stringify({
    action: "balance",
    token: "ETH"
  }));
  console.log("LLM received:", balResult);

  // 4. Simulate an LLM call to pay
  console.log("\n--- Simulating Payment ---");
  const payResult = await (tool as any)._call(JSON.stringify({
    action: "pay",
    to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    amount: 0.0001,
    token: "ETH"
  }));
  console.log("LLM received:", payResult);
}

main().catch(console.error);
