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

AgentPay uses a layered security model:

AgentPay enforces SDK-level spending policies before signing transactions. Smart-account integrations can be used as part of a stronger architecture, but this package does not guarantee on-chain policy enforcement for every configuration. Treat private keys and MCP payment access as sensitive production secrets.

1. **Client-side Policies:** Enforced by the SDK before any transaction is signed.
2. **Smart Account Support:** Smart-account integrations can add stronger controls when configured, but policy enforcement is not guaranteed on-chain for every setup.
3. **BigInt Precision:** Uses integer base units internally for policy checks.
4. **Persistent State:** File-backed state is used by default, with pluggable storage for production deployments.
