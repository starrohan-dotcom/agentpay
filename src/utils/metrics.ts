/**
 * Production-grade metrics collection for Prometheus-compatible monitoring.
 *
 * In production, replace this with prom-client or OpenTelemetry metrics SDK.
 * This implementation provides the same interface for zero-dependency usage.
 */

export interface MetricLabels {
    [key: string]: string;
}

interface MetricValue {
    value: number;
    labels: MetricLabels;
    timestamp: number;
}

/**
 * Counter metric - monotonically increasing value.
 */
export class Counter {
    private name: string;
    private help: string;
    private values: Map<string, number> = new Map();

    constructor(name: string, help: string) {
        this.name = name;
        this.help = help;
    }

    /**
     * Increments the counter by the given value (default 1).
     */
    inc(labels: MetricLabels = {}, value: number = 1): void {
        const key = this.labelKey(labels);
        const current = this.values.get(key) ?? 0;
        this.values.set(key, current + value);
    }

    /**
     * Returns the current counter value.
     */
    get(labels: MetricLabels = {}): number {
        return this.values.get(this.labelKey(labels)) ?? 0;
    }

    /**
     * Returns all counter values for Prometheus exposition format.
     */
    toPrometheus(): string {
        const lines: string[] = [
            `# HELP ${this.name} ${this.help}`,
            `# TYPE ${this.name} counter`,
        ];
        for (const [key, value] of this.values) {
            if (key) {
                lines.push(`${this.name}{${key}} ${value}`);
            } else {
                lines.push(`${this.name} ${value}`);
            }
        }
        return lines.join("\n") + "\n";
    }

    private labelKey(labels: MetricLabels): string {
        return Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(",");
    }
}

/**
 * Gauge metric - value that can go up and down.
 */
export class Gauge {
    private name: string;
    private help: string;
    private values: Map<string, number> = new Map();

    constructor(name: string, help: string) {
        this.name = name;
        this.help = help;
    }

    /**
     * Sets the gauge to a specific value.
     */
    set(labels: MetricLabels = {}, value: number): void {
        this.values.set(this.labelKey(labels), value);
    }

    /**
     * Increments the gauge by the given value.
     */
    inc(labels: MetricLabels = {}, value: number = 1): void {
        const key = this.labelKey(labels);
        const current = this.values.get(key) ?? 0;
        this.values.set(key, current + value);
    }

    /**
     * Decrements the gauge by the given value.
     */
    dec(labels: MetricLabels = {}, value: number = 1): void {
        const key = this.labelKey(labels);
        const current = this.values.get(key) ?? 0;
        this.values.set(key, current - value);
    }

    /**
     * Returns the current gauge value.
     */
    get(labels: MetricLabels = {}): number {
        return this.values.get(this.labelKey(labels)) ?? 0;
    }

    /**
     * Returns all gauge values for Prometheus exposition format.
     */
    toPrometheus(): string {
        const lines: string[] = [
            `# HELP ${this.name} ${this.help}`,
            `# TYPE ${this.name} gauge`,
        ];
        for (const [key, value] of this.values) {
            if (key) {
                lines.push(`${this.name}{${key}} ${value}`);
            } else {
                lines.push(`${this.name} ${value}`);
            }
        }
        return lines.join("\n") + "\n";
    }

    private labelKey(labels: MetricLabels): string {
        return Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(",");
    }
}

/**
 * Histogram metric - tracks distribution of values.
 */
export class Histogram {
    private name: string;
    private help: string;
    private buckets: number[];
    private values: Map<string, number[]> = new Map();
    private sums: Map<string, number> = new Map();
    private counts: Map<string, number> = new Map();

    constructor(name: string, help: string, buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]) {
        this.name = name;
        this.help = help;
        this.buckets = buckets;
    }

    /**
     * Observes a value, adding it to the histogram.
     */
    observe(labels: MetricLabels = {}, value: number): void {
        const key = this.labelKey(labels);

        // Initialize buckets if needed
        if (!this.values.has(key)) {
            this.values.set(key, new Array(this.buckets.length + 1).fill(0));
        }

        const bucketValues = this.values.get(key)!;

        // Increment appropriate bucket
        let placed = false;
        for (let i = 0; i < this.buckets.length; i++) {
            if (value <= this.buckets[i]) {
                bucketValues[i]++;
                placed = true;
                break;
            }
        }
        if (!placed) {
            bucketValues[this.buckets.length]++; // +Inf bucket
        }

        // Update sum and count
        this.sums.set(key, (this.sums.get(key) ?? 0) + value);
        this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
    }

    /**
     * Returns all histogram values for Prometheus exposition format.
     */
    toPrometheus(): string {
        const lines: string[] = [
            `# HELP ${this.name} ${this.help}`,
            `# TYPE ${this.name} histogram`,
        ];

        for (const [key, bucketValues] of this.values) {
            const sum = this.sums.get(key) ?? 0;
            const count = this.counts.get(key) ?? 0;
            let cumulative = 0;

            for (let i = 0; i < this.buckets.length; i++) {
                cumulative += bucketValues[i];
                const le = this.buckets[i];
                const labelStr = key ? `${key},le="${le}"` : `le="${le}"`;
                lines.push(`${this.name}_bucket{${labelStr}} ${cumulative}`);
            }

            // +Inf bucket
            cumulative += bucketValues[this.buckets.length];
            const infLabel = key ? `${key},le="+Inf"` : `le="+Inf"`;
            lines.push(`${this.name}_bucket{${infLabel}} ${cumulative}`);

            // Sum and count
            if (key) {
                lines.push(`${this.name}_sum{${key}} ${sum}`);
                lines.push(`${this.name}_count{${key}} ${count}`);
            } else {
                lines.push(`${this.name}_sum ${sum}`);
                lines.push(`${this.name}_count ${count}`);
            }
        }

        return lines.join("\n") + "\n";
    }

    private labelKey(labels: MetricLabels): string {
        return Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(",");
    }
}

// ── Application Metrics ──

/** Total number of payments initiated */
export const paymentsTotal = new Counter(
    "agentpay_payments_total",
    "Total number of payments initiated",
);

/** Total number of successful payments */
export const paymentsSucceeded = new Counter(
    "agentpay_payments_succeeded_total",
    "Total number of successful payments",
);

/** Total number of failed payments */
export const paymentsFailed = new Counter(
    "agentpay_payments_failed_total",
    "Total number of failed payments",
);

/** Total number of policy violations */
export const policyViolations = new Counter(
    "agentpay_policy_violations_total",
    "Total number of spending policy violations",
);

/** Current number of active agents */
export const activeAgents = new Gauge(
    "agentpay_active_agents",
    "Current number of active agent wallets",
);

/** Payment latency histogram (in seconds) */
export const paymentLatency = new Histogram(
    "agentpay_payment_latency_seconds",
    "Payment processing latency in seconds",
);

/** RPC call latency histogram (in seconds) */
export const rpcLatency = new Histogram(
    "agentpay_rpc_latency_seconds",
    "RPC call latency in seconds",
);

/** Current circuit breaker state (0=CLOSED, 1=OPEN, 2=HALF_OPEN) */
export const circuitBreakerState = new Gauge(
    "agentpay_circuit_breaker_state",
    "Current circuit breaker state (0=CLOSED, 1=OPEN, 2=HALF_OPEN)",
);

/** Current number of pending transactions in queue */
export const pendingTransactions = new Gauge(
    "agentpay_pending_transactions",
    "Current number of pending transactions in queue",
);

/**
 * Returns all metrics in Prometheus exposition format.
 */
export function getMetricsAsText(): string {
    return [
        paymentsTotal.toPrometheus(),
        paymentsSucceeded.toPrometheus(),
        paymentsFailed.toPrometheus(),
        policyViolations.toPrometheus(),
        activeAgents.toPrometheus(),
        paymentLatency.toPrometheus(),
        rpcLatency.toPrometheus(),
        circuitBreakerState.toPrometheus(),
        pendingTransactions.toPrometheus(),
    ].join("");
}