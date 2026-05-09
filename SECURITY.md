# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.3.x   | :white_check_mark: |
| < 1.3.0 | :x:                |

## Reporting a Vulnerability

We take the security of AgentPay seriously. If you believe you have found a security vulnerability, please report it to us by emailing security@agentpay.io (placeholder).

Please do **not** report security vulnerabilities via public GitHub issues.

### Our Security Model
AgentPay uses a multi-layered security model:
1. **Client-side Policies:** Enforced by the SDK before any transaction is signed.
2. **On-chain Guardrails:** When using Smart Accounts (ERC-7579), policies are enforced by the blockchain, making them un-bypassable even if the agent's code is compromised.
3. **BigInt Precision:** Prevents rounding exploits and overflow errors.
4. **Persistent State:** Ensures spending limits cannot be reset by restarting the agent process.
