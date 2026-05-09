# Official Anthropic MCP Registry Submission Guide

To reach 10,000 users, we need to be listed in the [Official Anthropic MCP Registry](https://github.com/modelcontextprotocol/servers). This makes AgentPay a "verified" choice for every Claude user.

## Your Pull Request (PR) Data

1.  **Fork** the repository: `https://github.com/modelcontextprotocol/servers`
2.  Add a new entry to the `src/mcp-servers.json` (or equivalent directory in their repo).
3.  **Use this exact JSON block:**

```json
{
  "name": "agentpay",
  "description": "The wallet protocol for AI agents. Give your agent a crypto wallet, spending limits, and transaction history on Base.",
  "githubUrl": "https://github.com/starrohan-dotcom/agentpay",
  "author": "starrohan",
  "runtime": "node",
  "installCommand": "npx -y @starrohan/agentpay mcp",
  "env": [
    {
      "name": "AGENT_PRIVATE_KEY",
      "description": "The private key of the agent's wallet (0x...)",
      "required": true
    },
    {
      "name": "RPC_URL",
      "description": "The RPC URL for the chain (Defaults to Base Sepolia)",
      "required": false
    }
  ],
  "tags": ["finance", "crypto", "wallet", "payments", "base", "autonomous-agents"]
}
```

## PR Description Template
**Title:** Add AgentPay - The wallet protocol for AI agents

**Body:**
Hello Anthropic Team!

I'm submitting **AgentPay**, an MCP server that provides secure, policy-enforced crypto wallets for AI agents.

**Key Features:**
- **Institutional Security:** Uses Safe (ERC-7579) Smart Accounts.
- **Native USDC:** Support for stablecoin payments on Base.
- **Spending Policies:** Max-per-transaction and daily limits enforced in code and on-chain.

This server allows Claude users to instantly give their AI the ability to pay for its own compute, data, and APIs autonomously and safely.

GitHub: https://github.com/starrohan-dotcom/agentpay
NPM: https://www.npmjs.com/package/@starrohan/agentpay

Thank you!
