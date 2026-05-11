import { describe, expect, it } from "vitest";
import {
  assertPaymentsEnabled,
  assertRecipientAllowed,
  getMcpTools,
  getPaymentSafetyConfig,
  parsePaymentArgs,
  parseToken,
} from "../src/mcp/safety.js";

const target = "0x71C7656EC7ab88b098defB751B7401B5f6d8976F";
const other = "0x0000000000000000000000000000000000000001";

describe("MCP payment safety", () => {
  it("keeps payments disabled unless explicitly enabled", () => {
    const config = getPaymentSafetyConfig({});

    expect(config.paymentsEnabled).toBe(false);
    expect(() => assertPaymentsEnabled(config)).toThrow(/AGENTPAY_ENABLE_PAYMENTS=true/);
  });

  it("enables payments only when the env value is exactly true", () => {
    expect(getPaymentSafetyConfig({ AGENTPAY_ENABLE_PAYMENTS: "true" }).paymentsEnabled).toBe(true);
    expect(getPaymentSafetyConfig({ AGENTPAY_ENABLE_PAYMENTS: "TRUE" }).paymentsEnabled).toBe(
      false,
    );
  });

  it("parses comma-separated recipient allowlists case-insensitively", () => {
    const config = getPaymentSafetyConfig({
      AGENTPAY_ALLOWED_RECIPIENTS: `${target.toLowerCase()}`,
    });

    expect(() => assertRecipientAllowed(target, config)).not.toThrow();
    expect(() => assertRecipientAllowed(other, config)).toThrow(
      /not in AGENTPAY_ALLOWED_RECIPIENTS/,
    );
  });

  it("allows any valid recipient when no allowlist is configured", () => {
    const config = getPaymentSafetyConfig({ AGENTPAY_ENABLE_PAYMENTS: "true" });

    expect(() => assertRecipientAllowed(target, config)).not.toThrow();
  });

  it("validates payment arguments before wallet calls", () => {
    expect(parsePaymentArgs({ to: target, amount: 0.001, token: "USDC", memo: "api" })).toEqual({
      to: target,
      amount: 0.001,
      token: "USDC",
      memo: "api",
    });

    expect(() => parsePaymentArgs({ to: "not-an-address", amount: 1 })).toThrow(/Invalid/);
    expect(() => parsePaymentArgs({ to: target, amount: -1 })).toThrow(/Invalid/);
  });

  it("validates balance token arguments", () => {
    expect(parseToken(undefined)).toBe("ETH");
    expect(parseToken("ETH")).toBe("ETH");
    expect(parseToken("USDC")).toBe("USDC");
    expect(() => parseToken("DAI")).toThrow(/Invalid token/);
  });
});

describe("MCP tool exposure", () => {
  it("omits send_payment when payments are disabled", () => {
    const tools = getMcpTools(getPaymentSafetyConfig({}));

    expect(tools.map((tool) => tool.name)).toEqual(["check_balance", "get_summary"]);
  });

  it("includes send_payment when payments are enabled", () => {
    const tools = getMcpTools(getPaymentSafetyConfig({ AGENTPAY_ENABLE_PAYMENTS: "true" }));

    expect(tools.map((tool) => tool.name)).toEqual([
      "check_balance",
      "send_payment",
      "get_summary",
    ]);
  });
});
