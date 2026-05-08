# Technical Due Diligence: @starrohan/agentpay

## 1. Executive Summary
AgentPay addresses a critical bottleneck in the Agentic Web: the ability for AI agents to handle money autonomously and safely. The project provides a "3-line" developer experience that is highly attractive for rapid prototyping. However, the current technical implementation is a **Proof of Concept (PoC)** and requires significant hardening before it can be considered a "good startup" foundation for production use.

## 2. Architecture Analysis
- **Tech Stack:** Built on `viem` and TypeScript, leveraging Base Sepolia (L2). This is a modern, high-performance choice for Ethereum-based agents.
- **Developer Experience (DX):** Excellent. The fluent `PolicyBuilder` and simple `AgentWallet` class make it extremely easy to integrate.
- **State Management:** **Critical Weakness.** All transaction history and daily spend tracking are stored in-memory. This means restarting the agent process wipes all "enforcement" data, allowing an agent to exceed its daily limits immediately upon reboot.

## 3. Security & Reliability
- **Client-Side Enforcement:** Policies are enforced in the library code, not on-chain. While this saves gas and reduces complexity, it means a compromised agent or local environment can easily bypass all limits by calling `walletClient` directly.
- **Precision Risks:** The use of JavaScript `number` for ETH amounts (which are 18-decimal fixed-point) is dangerous. Floating-point math can lead to precision loss, and `viem`'s `parseEther` will throw errors on scientific notation (e.g., `1e-18`), potentially crashing the agent.
- **Private Key Exposure:** The library requires the agent's private key to be passed in the config. Without a secure vault or Trusted Execution Environment (TEE) integration, this is a high-risk pattern for production agents.

## 4. Scalability
- **Data Persistence:** Without a database or persistent storage, the transaction history is lost on every restart. This makes it unsuitable for long-term agent workflows or "set and forget" deployments.
- **Chain Support:** Currently ETH/Base-centric. Expanding to USDC or other tokens will require significant refactoring of the internal math and transaction logic (handling decimals, allowances, etc.).

## 5. Roadmap Evaluation
- **On-chain policy enforcement:** This is the most critical item. Transitioning to a Smart Account (ERC-4337) or Safe-based architecture is necessary to move from "trust the code" to "trust the blockchain."
- **LangChain / AutoGen plugins:** High value for adoption, but currently these plugins would be passing around "insecure" wallets.
- **USDC Support:** Essential for business use cases where volatility is a concern.

## 6. Recommendations
1.  **Implement Persistence:** Add a storage interface (e.g., simple JSON file for PoC, Redis/SQL for production) to track `dailySpent` and `txHistory` across restarts.
2.  **Move to BigInt/Fixed-Point:** Replace `number` with `bigint` or a decimal library for all internal amount logic to prevent precision errors.
3.  **Smart Contract Wallets:** Pivot the core architecture towards Smart Accounts (using tools like Permissionless.js or Alchemy's Account Kit). This allows policy enforcement (e.g., spending limits) to happen in a smart contract, providing real security.
4.  **Environment Variable Safety:** At minimum, add better defaults for loading private keys and warning users about the risks of plaintext keys.

## 7. Conclusion
**Is it a good startup?**
The **idea** is excellent and the **market timing** is perfect. However, as a **technical foundation**, it is currently too brittle for production financial applications. If the team can pivot to smart-contract-based enforcement and fix the state persistence issues, AgentPay could become a vital piece of infrastructure for the AI economy.
