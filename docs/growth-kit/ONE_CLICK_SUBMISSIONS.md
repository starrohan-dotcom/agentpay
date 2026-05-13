# ONE-CLICK SUBMISSION LINKS

## 1. ⭐ Anthropic MCP Registry PR (HIGHEST PRIORITY)
**Direct Link**: https://github.com/modelcontextprotocol/servers/fork

### Steps:
1. Click the link above → Fork the repo
2. Navigate to your fork
3. Create a new file or edit the registry JSON
4. Add this entry:

```json
{
  "name": "agentpay",
  "description": "The wallet protocol for AI agents. Give your agent a crypto wallet, spending limits, and transaction history on Base.",
  "githubUrl": "https://github.com/starrohan-dotcom/agentpay",
  "author": "starrohan",
  "runtime": "node",
  "installCommand": "npx -y @starrohan/agentpay mcp",
  "env": [
    { "name": "AGENT_PRIVATE_KEY", "description": "The private key of the agent's wallet (0x...)", "required": true },
    { "name": "RPC_URL", "description": "Base or Base Sepolia RPC URL", "required": false },
    { "name": "AGENTPAY_ENABLE_PAYMENTS", "description": "Set to 'true' to enable send_payment tool", "required": false },
    { "name": "AGENTPAY_ALLOWED_RECIPIENTS", "description": "Comma-separated allowlist for MCP payments", "required": false }
  ],
  "tags": ["finance", "crypto", "wallet", "payments", "base", "autonomous-agents"]
}
```

5. Create PR with title: `Add AgentPay - The wallet protocol for AI agents`
6. Body: See `anthropic-registry.md` PR template

---

## 2. ⭐ Hacker News "Show HN" (SECOND HIGHEST)
**Direct Link**: https://news.ycombinator.com/submit

**Title**: Show HN: AgentPay – Universal wallet protocol for AI agents (Claude, LangChain, CrewAI)

**Body**:
```
Hi HN,

I built AgentPay because AI agents can think but they can't pay. For an agent to be truly autonomous, it needs to manage its own resources.

AgentPay provides a secure, policy-enforced wallet layer for AI agents:
- Non-custodial wallets on Base L2 (near-zero fees)
- Spending policies: max per tx, daily limits, recipient allowlists
- MCP server: drop it into Claude Desktop with zero code
- Plugins for LangChain, CrewAI, AutoGen
- 171 tests, production-grade circuit breakers, rate limiting, audit logging

npm install @starrohan/agentpay

GitHub: https://github.com/starrohan-dotcom/agentpay
npm: https://www.npmjs.com/package/@starrohan/agentpay

I'd love feedback on the security model and developer experience.
```

**Timing**: Post Tuesday-Thursday 8-10am ET for maximum visibility

---

## 3. Smithery.ai
**Direct Link**: https://smithery.ai/submit
- Already configured via `smithery.yaml`
- Just needs submission

---

## 4. LangChain Official Integration Issue
**Direct Link**: https://github.com/langchain-ai/langchain/issues/new

**Title**: `Add AgentPay as official wallet tool integration`

**Body**: See `OFFICIAL_SUBMISSIONS.md` for the exact template

---

## 5. Reddit Posts (Copy-Paste Ready)

### r/ClaudeAI
**Link**: https://reddit.com/r/ClaudeAI/submit
**Title**: I built an MCP server that gives Claude a crypto wallet with spending limits
**Body**:
```
I built AgentPay - an MCP server that lets Claude manage its own crypto wallet with built-in spending guardrails.

Just add this to your claude_desktop_config.json:
{
  "agentpay": {
    "command": "npx",
    "args": ["-y", "@starrohan/agentpay", "mcp"],
    "env": { "AGENT_PRIVATE_KEY": "0x..." }
  }
}

Features:
- Check balance (ETH/USDC)
- Send payments with policy enforcement
- Daily limits, max-per-tx, recipient allowlists
- All on Base L2 (near-zero fees)

npm: @starrohan/agentpay
GitHub: github.com/starrohan-dotcom/agentpay
```

### r/ethereum
**Link**: https://reddit.com/r/ethereum/submit
**Title**: AgentPay: Open-source wallet SDK for AI agents on Base L2
**Body**: Focus on the Ethereum/Base angle, smart accounts, ERC-4337

### r/LangChain
**Link**: https://reddit.com/r/LangChain/submit
**Title**: New LangChain tool: Give your agent a wallet with spending policies
**Body**: Focus on the LangChain integration, AgentPayTool

---

## 6. Twitter/X Thread (Copy-Paste Ready)

**Tweet 1**:
AI agents can think. But they can't PAY. 💳
Millions of agents hit the same wall: No autonomous bank account.
Today: AgentPay — the economic protocol for the Agentic Web.
(Thread 🧵)

**Tweet 2**:
AgentPay gives any AI agent a wallet, spending policies, and transaction history in 3 lines of code.
Built on @Base L2 for near-zero fees.
It's not just a wallet; it's a financial guardrail. 🛡️

**Tweet 3**:
Production-grade infrastructure built-in:
✅ Circuit breaker for RPC failures
✅ Retry with exponential backoff
✅ Rate limiting on payments
✅ Audit logging for compliance
✅ Prometheus metrics
✅ 171 tests, 15 test files

**Tweet 4**:
Universal integration:
🦜 @LangChainAI official plugin
🤝 @CrewAI native tool
🤖 AutoGen function registration
And the big one: MCP Server. Give @AnthropicAI's Claude a wallet with ZERO code.

**Tweet 5**:
We're building the "Stripe for AI Agents."
Try it: `npx agentpay`
npm: npmjs.com/package/@starrohan/agentpay
GitHub: github.com/starrohan-dotcom/agentpay
Join the machine economy. 🦄🚀

**Tag these**: @Base @AnthropicAI @LangChainAI @CrewAI @viem @BuildOnBase

---

## 7. Discord Messages (Copy-Paste Ready)

### LangChain Discord (#showcase)
```
🚀 New LangChain Integration: AgentPay

Give your LangChain agents autonomous wallets with spending policies.

npm install @starrohan/agentpay

import { AgentPayTool } from '@starrohan/agentpay'
const tool = new AgentPayTool(wallet)
// Drop into any LangChain agent instantly

Features:
- ETH & USDC payments on Base L2
- Policy engine: max per tx, daily limits, allowlists
- Full transaction history with memos
- Production-grade: circuit breakers, retry, rate limiting

GitHub: https://github.com/starrohan-dotcom/agentpay
```

### CrewAI Discord (#showcase)
```
🤝 New CrewAI Tool: AgentPay

Give your CrewAI agents autonomous wallets with built-in spending guardrails.

import { createCrewAIPayTool } from '@starrohan/agentpay'
const payTool = createCrewAIPayTool(wallet)

Your crew can now pay for APIs, data, and compute autonomously.
Policy-enforced. Non-custodial. MIT licensed.

npm: @starrohan/agentpay
GitHub: https://github.com/starrohan-dotcom/agentpay
```

---

## 8. Newsletter Submissions

### Node Weekly
**Link**: https://nodeweekly.com/submit
**Suggestion**: "AgentPay: Production-grade wallet SDK for AI agents. Circuit breakers, rate limiting, Prometheus metrics, 171 tests. Built on Base L2 with viem."

### JavaScript Weekly
**Link**: https://javascriptweekly.com/submit
**Suggestion**: Same as above

---

## 9. Dev.to Article
**Link**: https://dev.to/new
**Title**: "How to Give Your AI Agent a Bank Account in 60 Seconds"
**Tags**: #ai #web3 #typescript #tutorial #blockchain

---

## 10. YouTube Demo Script
**Title**: "Give Your AI Agent a Wallet in 60 Seconds | AgentPay Demo"
**Script**:
1. (0:00-0:05) Terminal: `npx agentpay`
2. (0:05-0:15) Show wallet creation with policy
3. (0:15-0:25) Show balance check
4. (0:25-0:40) Show payment execution with policy enforcement
5. (0:40-0:55) Show MCP integration with Claude
6. (0:55-1:00) "npm install @starrohan/agentpay"

---

## PRIORITY ORDER (Do these NOW, in this order):
1. ⭐ Fork & PR to modelcontextprotocol/servers (30 min)
2. ⭐ Post Show HN on Hacker News (15 min)
3. Submit to Smithery.ai (10 min)
4. Post to r/ClaudeAI (10 min)
5. Post Twitter/X thread (20 min)
6. Create LangChain GitHub issue (10 min)
7. Post to r/ethereum, r/LangChain, r/programming (20 min)
8. Post to Discord communities (15 min)
9. Submit to newsletters (10 min)
10. Write Dev.to article (45 min)