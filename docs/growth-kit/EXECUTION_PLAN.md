# 10K Downloads in 1 Week — Execution Plan

## Current Status
- **npm**: `@starrohan/agentpay@1.6.0` published
- **GitHub**: 23 stars (estimated), v1.6.0 tagged
- **Product**: Production-grade (~8.5/10), 171 tests, full CI/CD

## Target: 10,000 npm downloads by Day 7

### Traffic Funnel Math
To get 10,000 downloads, we need approximately:
- **100,000 impressions** (10% click-through)
- **20,000 clicks** to npm/GitHub (50% install rate)
- **10,000 installs**

---

## DAY 1: Registry Submissions (Capture Search Traffic)
**Goal: 500-1,000 downloads from organic discovery**

### 1A. Anthropic MCP Registry PR ⭐ HIGHEST PRIORITY
- **URL**: https://github.com/modelcontextprotocol/servers
- **Action**: Fork → Add entry → Submit PR
- **Impact**: Every Claude Desktop user searching for MCP tools finds AgentPay
- **Status**: [ ] PENDING

### 1B. Smithery.ai
- **URL**: https://smithery.ai
- **Action**: Submit via smithery.yaml (already configured)
- **Impact**: Listed in Smithery marketplace
- **Status**: [ ] PENDING

### 1C. Glama.ai
- **URL**: https://glama.ai/mcp
- **Action**: Submit MCP server listing
- **Impact**: AI agent developer discovery
- **Status**: [ ] PENDING

---

## DAY 2: Community Blitz (Drive Mass Awareness)
**Goal: 2,000-4,000 downloads**

### 2A. Hacker News "Show HN" ⭐ SECOND HIGHEST
- **URL**: https://news.ycombinator.com/submit
- **Title**: "Show HN: AgentPay – Universal wallet protocol for AI agents (Claude, LangChain, CrewAI)"
- **Timing**: Post Tuesday-Thursday 8-10am ET for maximum visibility
- **Status**: [ ] PENDING

### 2B. Reddit Posts
| Subreddit | Title | Timing |
|-----------|-------|--------|
| r/ClaudeAI | "I built an MCP server that gives Claude a crypto wallet with spending limits" | Day 2 |
| r/ethereum | "AgentPay: Open-source wallet SDK for AI agents on Base L2" | Day 2 |
| r/cryptocurrency | "The missing piece for AI agents: autonomous payments with guardrails" | Day 2 |
| r/LangChain | "New LangChain tool: Give your agent a wallet with spending policies" | Day 2 |
| r/programming | "Show r/programming: AgentPay - Wallet protocol for autonomous AI agents" | Day 3 |

### 2C. Twitter/X Thread
Post the viral thread from `viral-content-templates.md`. Tag:
- @Base
- @AnthropicAI
- @LangChainAI
- @CrewAI
- @viem
- @BuildOnBase (Jesse Pollak often retweets)

---

## DAY 3: Framework Integration (Convert Power Users)
**Goal: 3,000-5,000 downloads**

### 3A. LangChain Official Integration Issue
- **URL**: https://github.com/langchain-ai/langchain/issues/new
- **Template**: See `OFFICIAL_SUBMISSIONS.md`
- **Status**: [ ] PENDING

### 3B. CrewAI Discord
- **Server**: https://discord.gg/crewai
- **Channel**: #showcase
- **Message**: "Built a CrewAI tool that gives your agents autonomous wallets with spending limits. npm install @starrohan/agentpay"

### 3C. AutoGen Discord
- **Server**: https://discord.gg/microsoft-autogen
- **Channel**: #community-gallery
- **Message**: "AutoGen function tool for agent payments on Base. Policy-enforced, non-custodial."

---

## DAY 4-5: Content & SEO
**Goal: 1,000-2,000 downloads from long-tail**

### 4A. Dev.to Article
- **Title**: "How to Give Your AI Agent a Bank Account in 60 Seconds"
- **Tags**: #ai #web3 #typescript #tutorial

### 4B. Medium Article
- **Title**: "The Payment Wall: Why AI Agents Can't Spend Money (And How AgentPay Fixes It)"
- **Publication**: Submit to "The Startup" or "Better Programming"

### 4C. YouTube Demo
- **Script**: 60-second terminal demo showing `npx agentpay` → wallet creation → payment
- **Title**: "Give Your AI Agent a Wallet in 60 Seconds | AgentPay Demo"

---

## DAY 6-7: Amplification & Tracking
**Goal: Final push to 10,000**

### 6A. Newsletter Submissions
- **Node Weekly**: https://nodeweekly.com/submit
- **JavaScript Weekly**: https://javascriptweekly.com/submit
- **Web3 Weekly**: Various crypto newsletters

### 6B. GitHub Trending
- Ask friends/community to star the repo on the same day
- Need ~50-100 stars in a day to hit trending

### 6C. Track Progress
```bash
# Check download count
npm view @starrohan/agentpay downloads

# Check weekly downloads
curl -s "https://api.npmjs.org/downloads/point/last-week/@starrohan/agentpay"
```

---

## Priority Order (Do These NOW)
1. ⭐ **Anthropic MCP Registry PR** — 30 min, highest ROI
2. ⭐ **Hacker News Show HN** — 15 min, massive traffic spike
3. **Smithery.ai submission** — 10 min
4. **Reddit posts** — 30 min across 5 subreddits
5. **Twitter/X thread** — 20 min
6. **LangChain GitHub issue** — 10 min
7. **Discord announcements** — 15 min
8. **Dev.to article** — 45 min
9. **Newsletter submissions** — 10 min
10. **YouTube demo** — 1 hour