# Official Submission Guide: AgentPay

Follow these steps to cement AgentPay as the standard economic layer for AI agents.

## 1. Anthropic MCP Registry (Do This First)
**Goal:** High-volume traffic from Claude and Cursor users.

This submission is now automated via the `mcp-publisher` CLI.

1.  **Prepare your environment:**
    Ensure you have `mcpName` in `package.json` and `server.json` in your root (I have already added these for you).

2.  **Download the Publisher:**
    Go to [github.com/modelcontextprotocol/registry/releases](https://github.com/modelcontextprotocol/registry/releases) and download the version for your OS.

3.  **Run these commands:**
    ```powershell
    # Login with your starrohan-dotcom GitHub account
    ./mcp-publisher login github

    # Publish to the registry
    ./mcp-publisher publish
    ```

4.  **Status:** Once published, AgentPay will be searchable in all official MCP clients.

## 2. LangChain Official Integration (Do This Second)
**Goal:** Capture the largest community of agent developers.

1.  **Go here:** [github.com/langchain-ai/langchain](https://github.com/langchain-ai/langchain)
2.  Click **"Issues"** → **"New Issue"**.
3.  **Title:** `Add AgentPay as official wallet tool integration`
4.  **Use this exact Body:**

---
Hi LangChain team 👋

I've built an official LangChain plugin for AgentPay — an open source crypto wallet protocol for AI agents.

**Installation:**
`npm install @starrohan/agentpay`

**Usage:**
```ts
import { AgentPayTool } from '@starrohan/agentpay'
const tool = new AgentPayTool(wallet)
// drop into any LangChain agent instantly
```

**Features:**
→ Autonomous USDC payments on Base L2
→ Spending policy engine — agents can't overspend
→ ERC-7579 Smart Account support
→ Full transaction history with memos
→ Works with LangChain, CrewAI, AutoGen

The plugin is production ready, MIT licensed, and actively maintained.

Would love to be listed in the official integrations documentation 🙏

**GitHub:** github.com/starrohan-dotcom/agentpay
**npm:** npmjs.com/package/@starrohan/agentpay
---
