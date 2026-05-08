// ─────────────────────────────────────────────
// AgentPay — Usage Example
// ─────────────────────────────────────────────
// Run: node example.mjs

import "dotenv/config";
import { AgentWallet, policy } from "./src/index.ts";

// 1. Create your agent wallet with a spending policy
const agent = new AgentWallet({
    privateKey: (process.env.AGENT_PRIVATE_KEY as `0x${string}`) || "0xYOUR_PRIVATE_KEY_HERE",  // set via env var!
    agentId: "research-agent-01",           // give your agent a name

    policy: policy()
        .maxTx(0.00005)          // max 0.00005 ETH per transaction
        .dailyLimit(0.0002)      // max 0.0002 ETH per day total
        .warnAbove(0.00003)      // log a warning for large payments
        .build()
});

await agent.init();

// 2. Check balance
const bal = await agent.balance();
console.log("Agent balance:", bal, "ETH");

// 3. Make an autonomous payment
const tx = await agent.pay({
    to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",   // where to send
    amount: 0.00001,                   // how much ETH
    memo: "paying for weather API call" // optional label
});

console.log("Transaction hash:", tx.hash);
console.log("Basescan:", `https://sepolia.basescan.org/tx/${tx.hash}`);

// 4. Try to violate the policy — this will throw an error
try {
    await agent.pay({
        to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        amount: 99,  // way over the maxTx limit!
        memo: "this will be blocked"
    });
} catch (err) {
    console.log("Policy blocked the payment:", err.message);
}

// 5. Print a full summary
await agent.summary();

// 6. View transaction history
console.log("Transaction history:", agent.history());
