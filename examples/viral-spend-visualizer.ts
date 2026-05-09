/**
 * AgentPay Viral Spend Visualizer
 *
 * Run this to see a beautiful, high-fidelity log of your agent's activity.
 * Perfect for screen-recordings and social media demos.
 */

import "dotenv/config";
import { AgentWallet, policy } from "../src/index.js";
import { generatePrivateKey } from "viem/accounts";

async function runDemo() {
  const agent = new AgentWallet({
    privateKey: (process.env.AGENT_PRIVATE_KEY as `0x${string}`) || generatePrivateKey(),
    agentId: "marketing-bot-01",
    policy: policy().dailyLimit(100).build(),
  });

  await agent.init();

  console.clear();
  console.log(
    "\x1b[35m%s\x1b[0m",
    `
    █████╗  ██████╗ ███████╗███╗   ██╗████████╗██████╗  █████╗ ██╗   ██╗
    ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝██╔══██╗██╔══██╗╚██╗ ██╔╝
    ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   ██████╔╝███████║ ╚████╔╝
    ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   ██╔═══╝ ██╔══██║  ╚██╔╝
    ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   ██║     ██║  ██║   ██║
    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝     ╚═╝  ╚═╝   ╚═╝
    `,
  );

  console.log("\x1b[36m%s\x1b[0m", "--- Live Agent Activity Feed ---");

  const simulateWork = async (memo: string, amount: number, token: "ETH" | "USDC") => {
    console.log(`\n\x1b[90m[${new Date().toLocaleTimeString()}]\x1b[0m 🔄 Agent is ${memo}...`);

    // Manual update for demo speed (not waiting for real tx)
    (agent as any).dailySpent += token === "ETH" ? BigInt(amount * 1e18) : 0n;
    (agent as any).dailySpentUSDC += token === "USDC" ? BigInt(amount * 1e6) : 0n;

    console.log(`\x1b[32m✅ Success:\x1b[0m Paid ${amount} ${token} for ${memo}`);
    await drawProgressBar(agent);
  };

  const drawProgressBar = async (wallet: any) => {
    const ethUsed = Number(wallet.dailySpent) / 1e18;
    const usdcUsed = Number(wallet.dailySpentUSDC) / 1e6;

    console.log(`\x1b[33mSpend Tracker:\x1b[0m`);
    console.log(
      `ETH : [${"█".repeat(Math.min(20, ethUsed * 1000))}${"░".repeat(Math.max(0, 20 - ethUsed * 1000))}] ${ethUsed.toFixed(4)} spent`,
    );
    console.log(
      `USDC: [${"█".repeat(Math.min(20, usdcUsed / 2))}${"░".repeat(Math.max(0, 20 - usdcUsed / 2))}] ${usdcUsed.toFixed(2)} spent`,
    );
  };

  await simulateWork("Fetching market data", 0.0005, "ETH");
  await new Promise((r) => setTimeout(r, 1000));

  await simulateWork("Generating AI report", 2.5, "USDC");
  await new Promise((r) => setTimeout(r, 1000));

  await simulateWork("Storing results on IPFS", 0.0002, "ETH");
  await new Promise((r) => setTimeout(r, 1000));

  await simulateWork("Paying API credits", 5.0, "USDC");

  console.log("\n\x1b[36m%s\x1b[0m", "--- Agent Session Summary ---");
  await agent.summary();
}

runDemo().catch(console.error);
