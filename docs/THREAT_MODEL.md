# AgentPay Threat Model

## 1. Scope

This threat model covers the AgentPay SDK, MCP servers (stdio and SSE), and associated infrastructure. It follows the STRIDE methodology.

## 2. System Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  AI Client   │────▶│  MCP Server   │────▶│  AgentWallet │
│ (Claude/etc) │     │  (stdio/SSE)  │     │  (SDK Core)  │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
                    ┌──────────────┐     ┌──────▼──────┐
                    │   Storage     │◀────│  Policy      │
                    │ (File/Redis/  │     │  Engine      │
                    │  Postgres)    │     └──────┬──────┘
                    └──────────────┘            │
                                         ┌──────▼──────┐
                                         │  Blockchain  │
                                         │  (Base L2)   │
                                         └─────────────┘
```

## 3. Trust Boundaries

| Boundary | Description | Risk Level |
|----------|-------------|------------|
| AI Client → MCP Server | External AI requests wallet operations | HIGH |
| MCP Server → AgentWallet | Internal API calls | MEDIUM |
| AgentWallet → Blockchain | Transaction signing and submission | CRITICAL |
| AgentWallet → Storage | State persistence | HIGH |
| Environment → Process | Private keys in env vars | CRITICAL |

## 4. STRIDE Analysis

### 4.1 Spoofing

| Threat | Impact | Mitigation |
|--------|--------|------------|
| AI client impersonation | Unauthorized payments | Bearer token auth (`AGENTPAY_MCP_AUTH_TOKEN`), rate limiting |
| Fake RPC endpoint | Transaction manipulation | Use well-known RPC URLs, circuit breaker detects anomalies |
| Storage tampering | State corruption | Use database with access controls, checksums |

### 4.2 Tampering

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Payment amount modification in transit | Financial loss | Zod schema validation, policy engine checks |
| Policy bypass via direct `walletClient` access | Unlimited spending | Smart Account on-chain enforcement (future), code review |
| State file manipulation | Daily limit bypass | Production storage (Redis/Postgres) with auth |
| MCP message tampering | Unauthorized tool calls | Input validation, Zod schemas |

### 4.3 Repudiation

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Agent denies making payment | Compliance failure | Audit logger with immutable entries, blockchain is source of truth |
| Operator denies configuration | Accountability gap | Audit log captures all config changes |

### 4.4 Information Disclosure

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Private key in logs | Complete wallet compromise | Never log private keys, use `logger.info` with filtered metadata |
| Transaction history exposure | Privacy violation | Auth-protected audit endpoints |
| Balance information leak | Reconnaissance for attacks | Auth on all MCP endpoints |
| Environment variable dump | Credential theft | Process-level isolation, secrets manager integration |

### 4.5 Denial of Service

| Threat | Impact | Mitigation |
|--------|--------|------------|
| SSE connection flood | Service unavailable | Rate limiter on `/sse` endpoint |
| Payment spam | Resource exhaustion | Rate limiter on payment operations |
| RPC request flood | Chain access blocked | Circuit breaker, rate limiting on RPC calls |
| Storage exhaustion | State corruption | TTL on Redis, connection pooling on Postgres |

### 4.6 Elevation of Privilege

| Threat | Impact | Mitigation |
|--------|--------|------------|
| Bypass spending policy via code injection | Unlimited funds | Zod validation, no `eval()`, strict TypeScript |
| Smart Account privilege escalation | On-chain policy bypass | Safe Modules with multi-sig (future) |
| Storage provider injection | State manipulation | Validate storage provider interface |

## 5. Risk Matrix

| Risk | Likelihood | Impact | Priority |
|------|-----------|--------|----------|
| Private key exposure | Medium | Critical | P0 |
| Client-side policy bypass | Medium | High | P0 |
| RPC endpoint compromise | Low | Critical | P1 |
| DoS via connection flood | Medium | Medium | P1 |
| State file tampering | Low | Medium | P2 |
| Audit log tampering | Low | Low | P3 |

## 6. Security Controls (Implemented)

| Control | Status | Coverage |
|---------|--------|----------|
| Zod input validation | ✅ Implemented | All external inputs |
| Bearer token auth (SSE) | ✅ Implemented | MCP web server |
| Rate limiting | ✅ Implemented | SSE, tool calls, payments, RPC |
| Circuit breaker | ✅ Implemented | All RPC calls |
| Retry with backoff | ✅ Implemented | All RPC calls |
| Audit logging | ✅ Implemented | All financial operations |
| Prometheus metrics | ✅ Implemented | All critical paths |
| Payments disabled by default | ✅ Implemented | MCP server |
| Recipient allowlist | ✅ Implemented | MCP payments |
| Idempotency keys | ✅ Implemented | Payment operations |
| Non-root Docker user | ✅ Implemented | Container security |
| Health checks | ✅ Implemented | Docker & Kubernetes |

## 7. Security Controls (Planned)

| Control | Priority | Timeline |
|---------|----------|----------|
| On-chain policy enforcement (Safe Modules) | P0 | Q2 |
| HSM/Vault key management | P0 | Q2 |
| Multi-sig for high-value agents | P1 | Q3 |
| Penetration testing | P1 | Q3 |
| SOC2 Type II certification | P2 | Q4 |
| Bug bounty program | P2 | Q4 |
| Formal verification of PolicyEngine | P3 | Q1 next year |

## 8. Incident Response

### Severity Levels

- **SEV1 (Critical):** Private key compromise, on-chain fund loss
- **SEV2 (High):** Policy bypass, unauthorized payment
- **SEV3 (Medium):** Service degradation, rate limit bypass
- **SEV4 (Low):** Non-critical bug, cosmetic issue

### Response Process

1. **Detect:** Metrics alerts, audit log anomalies, user reports
2. **Contain:** Circuit breaker activation, payment disable flag
3. **Investigate:** Audit log analysis, blockchain forensics
4. **Remediate:** Patch, rotate keys, update policies
5. **Post-mortem:** Document timeline, root cause, preventive measures