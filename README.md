# AgentPay 💸🤖

Autonomous agent wallets with built-in spending policies for Ethereum. Let your AI agents pay — but never overspend.

## What is AgentPay?

AgentPay gives every AI agent its own Ethereum wallet with **programmable spending limits**. Your agent can make payments autonomously, but policy rules prevent runaway spending.

### Key Features

- 🤖 **Autonomous Payments** — agents send ETH without human approval
- 🛡️ **Spending Policies** — per-transaction caps, daily limits, address whitelists
- 📊 **Transaction Tracking** — full history with memos, timestamps, and status
- ⚠️ **Large Payment Warnings** — configurable alerts for big transactions
- 🔧 **Fluent Policy Builder** — clean API for defining spending rules

## Quickstart

### 1. Install

```bash
npm install agentpay
```

### 2. Create an Agent Wallet

```ts
import { AgentWallet, policy } from "agentpay";

const agent = new AgentWallet({
  privateKey: process.env.AGENT_PRIVATE_KEY!,  // your wallet private key
  agentId: "research-agent-01",                // give your agent a name

  policy: policy()
    .maxTx(0.00005)       // max 0.00005 ETH per transaction
    .dailyLimit(0.0002)   // max 0.0002 ETH per day total
    .warnAbove(0.00003)   // log warning for large payments
    .build()
});
```

### 3. Check Balance

```ts
const balance = await agent.balance();
console.log("Agent balance:", balance, "ETH");
```

### 4. Send a Payment

```ts
const tx = await agent.pay({
  to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  amount: 0.00001,
  memo: "paying for weather API call"
});

console.log("Transaction:", tx.hash);
```

### 5. Policy Violations Are Caught

```ts
try {
  await agent.pay({
    to: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    amount: 99,  // way over the maxTx limit!
    memo: "this will be blocked"
  });
} catch (err) {
  console.log(err.message);
  // [AgentPay] Policy violation: tx amount 99 ETH exceeds maxTxAmount 0.00005 ETH
}
```

### 6. View Summary & History

```ts
await agent.summary();
// [AgentPay] ── research-agent-01 Summary ──
//   Address:      0x5908...
//   Balance:      0.000079 ETH
//   Spent today:  0.00001 ETH
//   Transactions: 1
//   Daily limit:  0.0002 ETH (5.0% used)

const history = agent.history();
```

## Policy Builder API

```ts
const rules = policy()
  .maxTx(0.001)              // max per single transaction (ETH)
  .dailyLimit(0.01)          // max total spend per day (ETH)
  .allowOnly([               // whitelist of allowed recipient addresses
    "0x1234...",
    "0x5678..."
  ])
  .warnAbove(0.0005)         // log warning if tx exceeds this amount
  .build();
```

| Method | Description |
|--------|-------------|
| `maxTx(amount)` | Maximum ETH per single transaction |
| `dailyLimit(amount)` | Maximum total ETH spent per day |
| `allowOnly(addresses)` | Only allow payments to these addresses |
| `warnAbove(amount)` | Log a warning for payments above this amount |

## Running the Example

```bash
# Clone the repo
git clone https://github.com/Starrohan/agentpay.git
cd agentpay

# Install dependencies
npm install

# Set your private key
export AGENT_PRIVATE_KEY=0xYOUR_PRIVATE_KEY

# Run the example
npx tsx example.ts
```

## Network

AgentPay currently runs on **Base Sepolia** testnet. Get free testnet ETH from:
- https://faucet.quicknode.com/base/sepolia
- https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

## Security

⚠️ **Never commit your private key to git.** Always use environment variables:

```ts
const agent = new AgentWallet({
  privateKey: process.env.AGENT_PRIVATE_KEY!,
  // ...
});
```

## License

MIT
