<p align="center">
  <h1 align="center">💳 AgentPay</h1>
  <p align="center"><strong>The Financial Protocol for the Agentic Web</strong></p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@starrohan/agentpay"><img src="https://img.shields.io/npm/v/@starrohan/agentpay?color=blue&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@starrohan/agentpay"><img src="https://img.shields.io/npm/dm/@starrohan/agentpay?color=brightgreen&label=downloads" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/starrohan-dotcom/agentpay?color=blue" alt="MIT License"></a>
  <a href="https://github.com/starrohan-dotcom/agentpay/stargazers"><img src="https://img.shields.io/github/stars/starrohan-dotcom/agentpay?style=social" alt="stars"></a>
  <a href="https://twitter.com/Rohan_busarla"><img src="https://img.shields.io/twitter/follow/Rohan_busarla?style=social" alt="Twitter"></a>
</p>

---

> **AI agents can think, reason, and act. But they can't pay for anything. Until now.**

AgentPay gives any AI agent a crypto wallet with built-in spending guardrails — in 3 lines of code.

---

## ⚡ Quick Start

```bash
npx agentpay
```

```ts
import { AgentWallet, policy } from "@starrohan/agentpay";

const agent = new AgentWallet({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  agentId: "my-agent",
  policy: policy()
    .maxTx(0.001)       // Max per transaction
    .dailyLimit(0.01)   // Max per day
    .build()
});

await agent.init();

// Check balance
console.log(await agent.balance()); // "0.05 ETH"

// Make a payment
await agent.pay({
  to: "0xRECIPIENT",
  amount: 0.00001,
  memo: "API request"
});

// View history
await agent.summary();
```

---

## 🎯 Why AgentPay?

| | AgentPay | Stripe Agent SDK | Traditional |
|---|---|---|---|
| **Fees** | ~$0.001 (Base L2) | 2.9% + $0.30 | 3-5% |
| **Settlement** | Sub-second | 2-7 days | 1-5 days |
| **Global** | ✅ No borders | ❌ Country restricted | ❌ Country restricted |
| **Programmable** | ✅ Smart contracts | ❌ | ❌ |
| **Non-custodial** | ✅ Agent owns keys | ❌ | ❌ |
| **Open Source** | ✅ MIT | ❌ | ❌ |

---

## 📦 Features

- 💳 **Non-Custodial Wallets** — Agent-owned keys. Optional Safe Smart Accounts.
- 🛡️ **Spending Guardrails** — Max per tx, daily limits, recipient allowlists.
- 📋 **Transaction History** — Every payment logged. Survives restarts.
- 📊 **Multi-Asset** — ETH + USDC on Base. More chains coming.
- 🔌 **Framework Agnostic** — LangChain, CrewAI, AutoGen, MCP.
- ⚡ **Base L2** — Near-zero fees. Sub-second finality.
- 🏭 **Production Ready** — Circuit breakers, rate limiters, Redis/Postgres, Prometheus.

---

## 🤖 Works With Everything

### Claude Desktop (MCP)

```json
{
  "mcpServers": {
    "agentpay": {
      "command": "npx",
      "args": ["-y", "@starrohan/agentpay", "mcp"],
      "env": {
        "AGENT_PRIVATE_KEY": "0xYOUR_KEY",
        "RPC_URL": "https://sepolia.base.org"
      }
    }
  }
}
```

Restart Claude. Ask: *"What's my wallet balance?"*

### LangChain

```ts
import { AgentPayTool } from "@starrohan/agentpay/langchain";
const tools = [new AgentPayTool({ wallet: agent })];
```

### CrewAI

```ts
import { createAgentPayTools } from "@starrohan/agentpay/crewai";
const tools = createAgentPayTools({ wallet: agent });
```

### AutoGen

```ts
import { registerAgentPay } from "@starrohan/agentpay/autogen";
registerAgentPay({ wallet: agent });
```

---

## 🏗 Architecture

```
┌──────────────────────────────────────────┐
│              Your AI Agent                │
│   (LangChain / CrewAI / Claude / MCP)    │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│            AgentPay SDK                   │
│  ┌──────────┐ ┌────────┐ ┌───────────┐  │
│  │  Wallet  │ │ Policy │ │  History  │  │
│  │  Manager │ │ Engine │ │  Ledger   │  │
│  └──────────┘ └────────┘ └───────────┘  │
│  ┌──────────┐ ┌────────┐ ┌───────────┐  │
│  │  Smart   │ │Circuit │ │   Rate    │  │
│  │ Accounts │ │Breaker │ │  Limiter  │  │
│  └──────────┘ └────────┘ └───────────┘  │
└────────────────┬─────────────────────────┘
                 │
┌────────────────▼─────────────────────────┐
│              Base L2                      │
│     Near-zero fees · Sub-second · Global  │
└──────────────────────────────────────────┘
```

---

## 🛠 Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `AGENT_PRIVATE_KEY` | Hex-encoded private key (`0x...`) | Required |
| `RPC_URL` | Base or Base Sepolia RPC | `https://sepolia.base.org` |
| `USE_SMART_ACCOUNT` | Enable Safe Smart Accounts | `false` |
| `BUNDLER_URL` | ERC-4337 Bundler (for smart accounts) | — |
| `AGENTPAY_ENABLE_PAYMENTS` | Enable MCP payment execution | `false` |
| `AGENTPAY_ALLOWED_RECIPIENTS` | Address allowlist (comma-separated) | — |

---

## 🌟 Built With AgentPay

| Project | Description |
|---------|-------------|
| [Self-Sustaining Researcher](examples/researcher) | Agent pays for its own OpenAI API usage |
| [LangChain Wallet Agent](examples/langchain) | Autonomous agent with payment skills |

*Built something? Submit a PR to add it here!*

---

## 🤝 Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines. Good first issues are tagged.

---

## 🛡️ Security

Report vulnerabilities via [SECURITY.md](SECURITY.md). Audit: pending (Trail of Bits).

---

## 📄 License

MIT © [starrohan](https://github.com/starrohan-dotcom) · [@Rohan_busarla](https://twitter.com/Rohan_busarla)

---

<p align="center">
  <strong>⭐ Star this repo if you believe AI agents deserve their own wallets.</strong>
</p>
