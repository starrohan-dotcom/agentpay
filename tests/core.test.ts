import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AgentWallet, policy } from "../src/index.js";
import { generatePrivateKey } from "viem/accounts";
import { parseEther } from "viem";
import fs from "fs";
import path from "path";

describe("AgentPay Core Logic", () => {
  const privateKey = generatePrivateKey();
  const target = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";

  it("should enforce max transaction limits", async () => {
    const agent = new AgentWallet({
      privateKey,
      policy: policy().maxTx(0.001).build(),
    });
    await agent.init();

    // @ts-ignore - testing private engine
    const engine = agent.policyEngine;

    expect(() => engine.validate(target, parseEther("0.002"), "ETH", 0n, 0n))
      .toThrow(/exceeds maxTxAmount/);

    expect(() => engine.validate(target, parseEther("0.0005"), "ETH", 0n, 0n))
      .not.toThrow();
  });

  it("should enforce daily spending limits", async () => {
    const agent = new AgentWallet({
      privateKey,
      policy: policy().dailyLimit(0.01).build(),
    });
    await agent.init();

    // @ts-ignore
    const engine = agent.policyEngine;

    // 0.008 spent + 0.005 attempt = 0.013 > 0.01
    expect(() => engine.validate(target, parseEther("0.005"), "ETH", parseEther("0.008"), 0n))
      .toThrow(/Daily limit/);
  });

  it("should enforce allowlists", async () => {
    const agent = new AgentWallet({
      privateKey,
      policy: policy().allowOnly([target]).build(),
    });
    await agent.init();

    // @ts-ignore
    const engine = agent.policyEngine;

    expect(() => engine.validate(target, parseEther("0.0001"), "ETH", 0n, 0n))
      .not.toThrow();

    expect(() => engine.validate("0x0000000000000000000000000000000000000000", parseEther("0.0001"), "ETH", 0n, 0n))
      .toThrow(/not in the allowed list/);
  });

  it("should handle USDC decimals correctly", async () => {
    const agent = new AgentWallet({
        privateKey,
        policy: policy().maxTx(10).build(), // 10 USDC
    });
    await agent.init();

    // @ts-ignore
    const engine = agent.policyEngine;

    // 11 USDC = 11,000,000 units
    expect(() => engine.validate(target, BigInt(11_000_000), "USDC", 0n, 0n))
        .toThrow(/exceeds maxTxAmount/);

    // 5 USDC = 5,000,000 units
    expect(() => engine.validate(target, BigInt(5_000_000), "USDC", 0n, 0n))
        .not.toThrow();
  });
});
