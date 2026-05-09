export enum ErrorCode {
  POLICY_VIOLATION = "POLICY_VIOLATION",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  INVALID_CONFIGURATION = "INVALID_CONFIGURATION",
  STORAGE_ERROR = "STORAGE_ERROR",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  INITIALIZATION_REQUIRED = "INITIALIZATION_REQUIRED",
  UNSUPPORTED_TOKEN = "UNSUPPORTED_TOKEN",
}

export class AgentPayError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: any,
  ) {
    super(`[AgentPay] ${code}: ${message}`);
    this.name = "AgentPayError";
  }
}
