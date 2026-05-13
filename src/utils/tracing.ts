import { randomUUID } from "crypto";
import { type Tracer, type TraceSpan } from "./types.js";
import { logger } from "./logger.js";

/**
 * No-op trace span used when tracing is disabled.
 */
class NoopTraceSpan implements TraceSpan {
    startSpan(_name: string, _attributes?: Record<string, string | number | boolean>): TraceSpan {
        return this;
    }
    setAttribute(_key: string, _value: string | number | boolean): void { }
    recordException(_error: Error): void { }
    end(): void { }
    endWithError(_error: Error): void { }
}

/**
 * No-op tracer used when OpenTelemetry is not configured.
 */
class NoopTracer implements Tracer {
    startSpan(_name: string, _attributes?: Record<string, string | number | boolean>): TraceSpan {
        return new NoopTraceSpan();
    }
}

/**
 * Lightweight in-process tracer that logs span lifecycle events.
 * Replace with OpenTelemetry SDK in production for distributed tracing.
 */
class ConsoleTracer implements Tracer {
    startSpan(name: string, attributes?: Record<string, string | number | boolean>): TraceSpan {
        return new ConsoleTraceSpan(name, attributes);
    }
}

class ConsoleTraceSpan implements TraceSpan {
    private spanId: string;
    private name: string;
    private startTime: number;
    private children: ConsoleTraceSpan[] = [];

    constructor(name: string, attributes?: Record<string, string | number | boolean>) {
        this.spanId = randomUUID().slice(0, 8);
        this.name = name;
        this.startTime = Date.now();
        if (attributes && Object.keys(attributes).length > 0) {
            logger.debug(`[trace] ${this.name} started`, { spanId: this.spanId, ...attributes });
        }
    }

    startSpan(name: string, attributes?: Record<string, string | number | boolean>): TraceSpan {
        const child = new ConsoleTraceSpan(`${this.name}.${name}`, attributes);
        this.children.push(child);
        return child;
    }

    setAttribute(_key: string, _value: string | number | boolean): void {
        // In production, this would set OTel span attributes
    }

    recordException(error: Error): void {
        logger.error(`[trace] ${this.name} exception`, {
            spanId: this.spanId,
            error: error.message,
        });
    }

    end(): void {
        const duration = Date.now() - this.startTime;
        // End all children first
        for (const child of this.children) {
            child.end();
        }
        logger.debug(`[trace] ${this.name} completed`, {
            spanId: this.spanId,
            durationMs: duration,
        });
    }

    endWithError(error: Error): void {
        this.recordException(error);
        const duration = Date.now() - this.startTime;
        logger.debug(`[trace] ${this.name} failed`, {
            spanId: this.spanId,
            durationMs: duration,
            error: error.message,
        });
    }
}

/**
 * Singleton tracer instance.
 * Set TRACING_ENABLED=true to enable console-based tracing.
 * In production, replace with OpenTelemetry SDK.
 */
let _tracer: Tracer = new NoopTracer();

export function getTracer(): Tracer {
    return _tracer;
}

export function setTracer(tracer: Tracer): void {
    _tracer = tracer;
}

/**
 * Initialize tracing. Call once at application startup.
 */
export function initTracing(): void {
    if (process.env.TRACING_ENABLED === "true") {
        _tracer = new ConsoleTracer();
        logger.info("Tracing initialized (console mode)");
    } else {
        logger.debug("Tracing disabled (set TRACING_ENABLED=true to enable)");
    }
}

/**
 * Convenience: execute an async operation within a traced span.
 */
export async function withSpan<T>(
    name: string,
    operation: (span: TraceSpan) => Promise<T>,
    attributes?: Record<string, string | number | boolean>,
): Promise<T> {
    const span = getTracer().startSpan(name, attributes);
    try {
        const result = await operation(span);
        span.end();
        return result;
    } catch (err: any) {
        span.endWithError(err);
        throw err;
    }
}