# @starrohan/agentpay

> **The Financial Protocol for the Agentic Web.** Give any AI agent a crypto wallet, spending guardrails, and transaction history in 3 lines of code.

[![npm version](https://img.shields.io/npm/v/@starrohan/agentpay)](https://www.npmjs.com/package/@starrohan/agentpay)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built on Base](https://img.shields.io/badge/Built%20on-Base-0052FF)](https://base.org)

---

## 🚀 Vision

AI agents can think, but they can't pay. For an agent to be truly autonomous, it must manage its own resources—compute, data, and services. AgentPay provides the secure, non-custodial economic layer for the next generation of AI.

## 📦 Features

- 💳 **Institutional Security** — Built on Safe (ERC-7579) Smart Accounts.
- 🛡️ **Spending Policies** — Max per transaction, daily limits, and allowlists.
- 📋 **Persistent History** — Every payment logged and preserved across agent restarts.
- 📊 **Multi-Asset** — Native support for **ETH** and **USDC** on Base.
- 🔌 **Universal Plugins** — Drop-in support for LangChain, CrewAI, AutoGen, and MCP.
- ⚡ **Zero Friction** — Near-zero fees and sub-second settlement via Base L2.

---

## 🛠️ Quickstart

### 1. Initialize Project
```bash
npx agentpay
```

### 2. Usage
```ts
import "dotenv/config";
import { AgentWallet, policy } from "@starrohan/agentpay";

const agent = new AgentWallet({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  agentId: "research-agent-01",
  policy: policy().maxTx(0.001).dailyLimit(0.01).build()
});

await agent.init();
await agent.pay({ to: "0xRECIPIENT", amount: 0.00001, memo: "API request" });
```

---

## 🤖 Integrations

AgentPay is framework-agnostic. Give your favorite AI a wallet instantly.

### Claude Desktop / MCP
Supports **Model Context Protocol (MCP)**. Give Claude a wallet with zero code. [See setup guide](#-mcp-setup-guide).

### Frameworks
- 🦜 **LangChain:** Official `AgentPayTool` integration.
- 🤝 **CrewAI:** Native tool generator for multi-agent teams.
- 🤖 **AutoGen:** Standard function registration support.

---

## 🌟 Agent Showcase

Are you building something with AgentPay? [Submit a PR](https://github.com/starrohan-dotcom/agentpay/pulls) to add your project here!

- **[Self-Sustaining Researcher]** — An agent that pays for its own OpenAI usage.
- **[LangChain Wallet Agent]** — A basic agent with autonomous payment skills.

---

## 🛠 MCP Setup Guide

Give your Claude Desktop AI a wallet in 60 seconds.

1.  **Open your Claude Desktop config:**
    - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
    - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

2.  **Add AgentPay to the `mcpServers` list:**

```json
{
  "mcpServers": {
    "agentpay": {
      "command": "npx",
      "args": ["-y", "@starrohan/agentpay", "mcp"],
      "env": {
        "AGENT_PRIVATE_KEY": "0xYOUR_PRIVATE_KEY_HERE",
        "RPC_URL": "https://sepolia.base.org",
        "USE_SMART_ACCOUNT": "true",
        "BUNDLER_URL": "https://api.pimlico.io/v2/base-sepolia/rpc?apikey=YOUR_API_KEY"
      }
    }
  }
}
```

### Advanced Config
| Env Var | Description |
|---------|-------------|
| `AGENT_PRIVATE_KEY` | Hex-encoded private key (starts with 0x) |
| `RPC_URL` | Base or Base Sepolia RPC URL |
| `USE_SMART_ACCOUNT` | Set to `true` to use Safe Smart Accounts |
| `BUNDLER_URL` | ERC-4337 Bundler URL (Required if `USE_SMART_ACCOUNT` is true) |
| `AGENT_ID` | Custom identifier for state persistence |

3.  **Restart Claude.** You will now see a 💳 icon. Ask Claude: *"What is my wallet balance?"*

---

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 🛡️ Security

Security is our top priority. If you find a vulnerability, please report it via the process in our [SECURITY.md](SECURITY.md).

## 📄 License

MIT © [starrohan](https://github.com/starrohan)
