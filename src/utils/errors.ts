import { randomUUID } from "crypto";
import { type ApiErrorResponse } from "./types.js";

export enum ErrorCode {
  POLICY_VIOLATION = "POLICY_VIOLATION",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  INVALID_CONFIGURATION = "INVALID_CONFIGURATION",
  STORAGE_ERROR = "STORAGE_ERROR",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  INITIALIZATION_REQUIRED = "INITIALIZATION_REQUIRED",
  UNSUPPORTED_TOKEN = "UNSUPPORTED_TOKEN",
  CIRCUIT_BREAKER_OPEN = "CIRCUIT_BREAKER_OPEN",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  SECRETS_UNAVAILABLE = "SECRETS_UNAVAILABLE",
}

export class AgentPayError extends Error {
  public readonly correlationId: string;
  public readonly timestamp: string;

  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(`[AgentPay] ${code}: ${message}`);
    this.name = "AgentPayError";
    this.correlationId = correlationId ?? randomUUID();
    this.timestamp = new Date().toISOString();
  }

  /**
   * Returns a standardized API error response suitable for HTTP/MCP responses.
   */
  toApiResponse(): ApiErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        correlationId: this.correlationId,
        timestamp: this.timestamp,
        details: this.details,
      },
    };
  }
}
