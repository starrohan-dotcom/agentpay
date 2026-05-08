# @starrohan/agentpay

> The wallet protocol for AI agents. Give any AI agent a crypto wallet, spending limits, and transaction history in 3 lines of code.

[![npm version](https://img.shields.io/npm/v/@starrohan/agentpay)](https://www.npmjs.com/package/@starrohan/agentpay)
[![license](https://img.shields.io/npm/l/@starrohan/agentpay)](LICENSE)
[![built on Base](https://img.shields.io/badge/built%20on-Base-0052FF)](https://base.org)

---

## The problem

AI agents can think. They can't pay.

Millions of agents are being deployed to do real work — browse the web, call APIs, hire services. But every one hits the same wall: **no way to handle money autonomously.**

AgentPay fixes that.

---

## Install

```bash
npm install @starrohan/agentpay
```

---

## Quickstart — 3 lines

```ts
import { AgentWallet, policy } from "@starrohan/agentpay";

const agent = new AgentWallet({
  privateKey: "0xYOUR_PRIVATE_KEY",
  agentId: "my-agent",
  policy: policy().maxTx(0.001).dailyLimit(0.01).build()
});

await agent.pay({ to: "0xRECIPIENT", amount: 0.00001, memo: "API call" });
```

That's it. Your agent now has a wallet, spending limits, and a full transaction history.

---

## Features

- 💳 **Autonomous payments** — agent sends crypto with no human clicking anything
- 🛡️ **Spending policy** — set max per transaction, daily limits, and recipient allowlists — enforced in code
- 📋 **Transaction history** — every payment logged with timestamp, memo, and status
- 📊 **Daily spend tracker** — know exactly how much your agent spent today
- ⚡ **Base L2** — sub-second settlement, near-zero gas fees (~$0.000001 per tx)
- 🔌 **Framework agnostic** — works with LangChain, AutoGen, CrewAI, or any agent

---

## API Reference

### `new AgentWallet(config)`

```ts
const agent = new AgentWallet({
  privateKey: "0x...",     // agent's wallet private key
  agentId: "my-agent",    // optional human-readable name
  policy: SpendingPolicy, // optional spending rules
  rpcUrl: "https://...",  // optional custom RPC (default: Base Sepolia)
});
```

---

### `policy()` — spending policy builder

```ts
const rules = policy()
  .maxTx(0.001)                          // max 0.001 ETH per transaction
  .dailyLimit(0.01)                      // max 0.01 ETH per day
  .allowOnly(["0xABC...", "0xDEF..."])   // whitelist of allowed recipients
  .warnAbove(0.0005)                     // log warning for large payments
  .build();
```

---

### `agent.pay(opts)` → `TxRecord`

```ts
const tx = await agent.pay({
  to: "0xRECIPIENT_ADDRESS",
  amount: 0.00001,           // in ETH
  memo: "weather API call",  // optional label
});

console.log(tx.hash);      // transaction hash
console.log(tx.status);    // "success" | "failed"
console.log(tx.timestamp); // Date
```

Policy violations throw immediately — the payment never goes out:

```
Error: [AgentPay] Policy violation: tx amount 99 ETH exceeds maxTxAmount 0.001 ETH
```

---

## Security

- ✅ **Persistent state** — daily limits and transaction history survive agent restarts
- ✅ **BigInt math** — all internal calculations use Wei for absolute precision (no floating-point errors)
- ✅ **Environment variables** — secure private key management via `.env` support
- ✅ **Policy enforcement** — autonomous guardrails that cannot be bypassed by agent logic

---

### `agent.balance()` → `string`

```ts
const bal = await agent.balance();
console.log(bal); // "0.000079 ETH"
```

---

### `agent.history()` → `TxRecord[]`

```ts
const txs = agent.history();
// [{ hash, to, amount, memo, timestamp, status }, ...]
```

---

### `agent.dailySpentSoFar()` → `number`

```ts
const spent = agent.dailySpentSoFar();
console.log(`Agent spent ${spent} ETH today`);
```

---

### `agent.summary()`

Prints a full summary to console:

```
[AgentPay] ── my-agent Summary ──
  Address:      0x5908AE35...
  Balance:      0.000079 ETH
  Spent today:  0.00001 ETH
  Transactions: 1
  Daily limit:  0.01 ETH (0.1% used)
```

---

## Real example output

```bash
Agent balance: 0.000089873993838909 ETH
[AgentPay] my-agent paying 0.00001 ETH to 0x71C7... (paying for weather API call)...
[AgentPay] ✅ Payment sent!
[AgentPay] 🔗 https://sepolia.basescan.org/tx/0x8be8d2...

Policy blocked the payment: tx amount 99 ETH exceeds maxTxAmount 0.00001 ETH

[AgentPay] ── my-agent Summary ──
  Address:      0x5908AE35d80D3c69F702b1cbC8dfC1bE0D3A064B
  Balance:      0.000079 ETH
  Spent today:  0.00001 ETH
  Transactions: 1
  Daily limit:  0.0002 ETH (5.0% used)
```

---

## Use with LangChain

```ts
import { AgentWallet, policy } from "@starrohan/agentpay";
import { Tool } from "langchain/tools";

class AgentPayTool extends Tool {
  name = "agent_wallet";
  description = `Pay for services or check balance.
    Input JSON: { "action": "pay"|"balance", "to": "0x...", "amount": 0.00001 }`;

  constructor(private wallet: AgentWallet) { super(); }

  async _call(input: string): Promise<string> {
    const { action, to, amount } = JSON.parse(input);
    if (action === "pay") {
      const tx = await this.wallet.pay({ to, amount });
      return `Paid ${amount} ETH to ${to}. Tx: ${tx.hash}`;
    }
    const bal = await this.wallet.balance();
    return `Balance: ${bal} ETH`;
  }
}

// Drop into any LangChain agent:
// const tool = new AgentPayTool(agent);
```

---

## Network

Currently running on **Base Sepolia testnet**. Mainnet support coming in v0.2.

Get free testnet ETH: [coinbase.com/faucets/base-ethereum-sepolia-faucet](https://coinbase.com/faucets/base-ethereum-sepolia-faucet)

---

## Roadmap

- [x] AgentWallet class with pay, balance, history
- [x] Spending policy engine (maxTx, dailyLimit, allowlist)
- [x] Base Sepolia testnet
- [ ] LangChain / AutoGen / CrewAI plugins
- [ ] Base mainnet + USDC support
- [ ] Smart contract policy enforcement (on-chain)
- [ ] Enterprise dashboard
- [ ] Agent-to-agent payments

---

## Built by

[@starrohan-dotcom](https://github.com/starrohan) — building the economic infrastructure for AI agents.

Follow the journey on X: **@starrohan**

---

## License

MIT
