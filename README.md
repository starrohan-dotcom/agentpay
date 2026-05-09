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

## Quickstart — 1 command

Initialize your agent project in 5 seconds:
```bash
npx agentpay
```

[![Deploy to Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/starrohan-dotcom/agentpay&envs=AGENT_PRIVATE_KEY,RPC_URL)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/D8609M?referralCode=agentpay)
[![Deploy on Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/starrohan-dotcom/agentpay&env=AGENT_PRIVATE_KEY,RPC_URL)

---

## Usage — 3 lines

```ts
import "dotenv/config";
import { AgentWallet, policy } from "@starrohan/agentpay";

const agent = new AgentWallet({
  privateKey: process.env.AGENT_PRIVATE_KEY as `0x${string}`,
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

## Examples & Use Cases

Check out our [examples/](https://github.com/starrohan-dotcom/agentpay/tree/main/examples) directory for high-impact integrations:

- 🤖 **[Self-Sustaining Agent](https://github.com/starrohan-dotcom/agentpay/blob/main/examples/self-sustaining-agent.ts)** — An agent that pays for its own OpenAI/Anthropic API usage.
- 🦜 **[LangChain Official Plugin](https://github.com/starrohan-dotcom/agentpay/blob/main/examples/langchain-official-plugin.ts)** — Built-in Tool support for LangChain agents.
- 🤝 **CrewAI Support** — Native tool generator for multi-agent workflows.
- 🤖 **AutoGen Integration** — JSON Schema & implementation for AutoGen functions.
- 🤖 **[Claude Desktop / MCP Support](https://github.com/starrohan-dotcom/agentpay#claude-desktop--mcp)** — Use AgentPay directly in Claude with zero code.
- 🤖 **[Self-Sustaining Agent](https://github.com/starrohan-dotcom/agentpay/blob/main/examples/self-sustaining-agent.ts)** — An agent that pays for its own OpenAI/Anthropic API usage.
- 🕵️ **Autonomous Researcher** — Paying for premium data and search APIs.

---

## 🌟 Agent Showcase

Are you building something with AgentPay? Submit a PR to add your project here!

- **[Your Project Name]** — A brief description of what your agent does.

### Badges

Show the world your agent is self-funded:

`[![Powered by AgentPay](https://raw.githubusercontent.com/starrohan-dotcom/agentpay/main/assets/powered-by.svg)](https://github.com/starrohan-dotcom/agentpay)`

---

## Integrations

### LangChain

AgentPay provides an official LangChain tool for easy integration. (Status: [Submission Pending](https://github.com/langchain-ai/langchain/issues))

```ts
import { AgentWallet, AgentPayTool } from "@starrohan/agentpay";

const agent = new AgentWallet({ privateKey: "0x..." });
await agent.init();

const agentPayTool = new AgentPayTool(agent);
```

### CrewAI

Generate tools compatible with CrewAI agents:

```ts
import { AgentWallet, createCrewAIPayTool } from "@starrohan/agentpay";

const wallet = new AgentWallet({ privateKey: "0x..." });
await wallet.init();

const walletTool = createCrewAIPayTool(wallet);
// const agent = new Agent({ tools: [walletTool], ... });
```

### AutoGen

Native function registration for AutoGen:

```ts
import { AgentWallet, getAutoGenPayTool } from "@starrohan/agentpay";

const wallet = new AgentWallet({ privateKey: "0x..." });
await wallet.init();

const { schema, implementation } = getAutoGenPayTool(wallet);
// register_function(implementation, schema, ...);
```

### Claude Desktop / MCP

AgentPay supports the **Model Context Protocol (MCP)**. (Status: [Official Registry Submission Pending](https://github.com/modelcontextprotocol/servers/pulls))

You can give your Claude Desktop AI a wallet in 60 seconds.

1.  Open your Claude Desktop config:
    - **macOS:** `~/Library/Application\ Support/Claude/claude_desktop_config.json`
    - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2.  Add AgentPay to the `mcpServers` list:

```json
{
  "mcpServers": {
    "agentpay": {
      "command": "npx",
      "args": ["-y", "@starrohan/agentpay", "mcp"],
      "env": {
        "AGENT_PRIVATE_KEY": "0xYOUR_PRIVATE_KEY_HERE",
        "RPC_URL": "https://sepolia.base.org"
      }
    }
  }
}
```

3.  Restart Claude. You will now see a 💳 icon, and you can ask Claude: *"What is my wallet balance?"* or *"Send 0.001 ETH to 0x..."*

### Claude Code (CLI)

If you use Anthropic's terminal agent, run:
```bash
claude mcp add agentpay npx -y @starrohan/agentpay mcp
```

### Roo Code (VS Code)

AgentPay works perfectly with **Roo Code**.

1.  Open the Roo Code side panel in VS Code.
2.  Click on the **MCP Settings** icon (or open `.roo/mcp_settings.json`).
3.  Add the following configuration:

```json
{
  "mcpServers": {
    "agentpay": {
      "command": "npx",
      "args": ["-y", "@starrohan/agentpay", "mcp"],
      "env": {
        "AGENT_PRIVATE_KEY": "0xYOUR_PRIVATE_KEY_HERE",
        "RPC_URL": "https://sepolia.base.org"
      }
    }
  }
}
```

4.  Roo Code will automatically detect the new tools. You can now tell Roo: *"Pay for the API credits using my AgentPay wallet."*

### Hosted MCP (Railway/Vercel)

If you don't want to run AgentPay locally, you can use the **Hosted Version**.

1.  Click the **Deploy to Railway** button at the top of this README.
2.  Once deployed, you will get a URL (e.g., `https://agentpay-production.up.railway.app`).
3.  In your Claude/Roo Code config, use the `sse` transport:

```json
{
  "mcpServers": {
    "agentpay": {
      "url": "https://your-railway-url.app/sse"
    }
  }
}
```

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

- ✅ **Persistent state** — daily limits and transaction history survive agent restarts (supports File, Redis, or SQL)
- ✅ **Smart Accounts (ERC-7579)** — optional on-chain wallet for "un-hackable" security
- ✅ **USDC Support** — native stablecoin payments on Base
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

### `agent.dailySpentSoFar(token?)` → `string`

```ts
const spent = agent.dailySpentSoFar("USDC");
console.log(`Agent spent ${spent} USDC today`);
```

---

### `agent.summary()`

Prints a full summary of all assets to console:

```
[AgentPay] ── my-agent Summary ──
  Address:      0x5908AE35...
  Balance:      0.000079 ETH | 150.00 USDC
  Spent today:  0.00001 ETH | 5.00 USDC
  Transactions: 1
  Daily limit:  0.01 (Policy enforced)
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
  Address:      0x5908AE35...
  Balance:      0.000079 ETH | 150.00 USDC
  Spent today:  0.00001 ETH | 5.00 USDC
  Transactions: 1
  Daily limit:  0.01 (Policy enforced)
```

---

## Network

Supports **Base Sepolia testnet** and **Base Mainnet**.

To use Mainnet, simply provide a Mainnet RPC URL in the config:
```ts
const agent = new AgentWallet({
  privateKey: "0x...",
  rpcUrl: "https://mainnet.base.org" // Default is Base Sepolia
});
```

---

## Roadmap

- [x] AgentWallet class with pay, balance, history
- [x] Spending policy engine (maxTx, dailyLimit, allowlist)
- [x] Base Sepolia testnet
- [x] Persistent state & BigInt precision (v1.1.1)
- [x] USDC support (v1.2.0)
- [x] Smart Account (ERC-7579) integration (v1.2.0)
- [x] LangChain / AutoGen / CrewAI plugins (v1.2.0)
- [x] Claude Desktop / MCP Support (v1.2.0)
- [ ] Enterprise dashboard
- [ ] Agent-to-agent payments

---

## Built by

[@starrohan-dotcom](https://github.com/starrohan) — building the economic infrastructure for AI agents.

Follow the journey on X: **@starrohan**

---

## License

MIT
