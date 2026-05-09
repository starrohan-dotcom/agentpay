# Script: Building a Self-Sustaining Agent (Long-form Tutorial)

## Introduction (0:00 - 2:00)
*   **Hook:** "AI agents are hitting a wall. They can think, they can plan, but they can't pay for the tools they need to finish the job."
*   **The Solution:** Introducing AgentPay, the first economic protocol for agents.
*   **What we’re building:** An agent that researches a topic and pays for its own premium data access.

## The Foundation: Why Base & Safe? (2:00 - 4:00)
*   Explain why we use **Base** (Fast, Cheap) and **Safe** (On-chain policies).
*   Show the `PolicyBuilder` API: "This is how we stop the agent from spending too much."

## Step 1: Project Setup (4:00 - 6:00)
*   Run `npx agentpay`.
*   Explain the `.env` and `agent.ts` structure.
*   "We’re moving from prototype to production-grade in minutes."

## Step 2: Coding the Agent (6:00 - 10:00)
*   Drop in the **LangChain Official Plugin**.
*   Show how the agent decides to use the `agent_wallet` tool.
*   Demo: Agent checks balance -> Sees it has enough -> Executes payment for a search API.

## Step 3: Live Demo (10:00 - 13:00)
*   Run the script.
*   Show the **Viral Spend Visualizer** output.
*   "Look at those progress bars. The agent is managing its own budget live."

## Conclusion & CTA (13:00 - 15:00)
*   Summarize the vision: "The Machine Economy is here."
*   CTA: Star the repo, join the Discord, and submit your agent to the showcase.

---

## Technical Visuals to Include:
1.  **BigInt Precision:** Briefly show the code using Wei to explain why it's secure.
2.  **Spending Policy Error:** Intentionally trigger a limit breach to show the guardrails in action.
