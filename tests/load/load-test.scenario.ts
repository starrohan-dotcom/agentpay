/**
 * Load Test Scenarios for AgentPay
 *
 * These scenarios define the load testing strategy for production readiness.
 * Run with: npx artillery run tests/load/agentpay-load.yml
 * Or use k6: npx k6 run tests/load/agentpay-load.js
 *
 * Production targets:
 * - 1000 concurrent agent wallets
 * - 100 payments/second sustained
 * - p99 latency < 5 seconds
 * - Zero policy violations under load
 * - Circuit breaker triggers correctly under RPC failure
 */

export const LOAD_TEST_SCENARIOS = {
    /** Baseline: steady-state payment throughput */
    steadyState: {
        description: "100 payments/sec for 5 minutes with 500 concurrent agents",
        target: 100, // requests/sec
        duration: 300, // seconds
        concurrentAgents: 500,
        expectedP99Latency: 5000, // ms
        expectedErrorRate: 0.001, // 0.1%
    },

    /** Spike: sudden burst of payments */
    burstTest: {
        description: "Sudden spike from 10 to 500 payments/sec",
        rampUpSeconds: 5,
        peakTarget: 500,
        peakDuration: 60,
        expectedCircuitBreakerTrip: false,
    },

    /** Soak: extended duration test */
    soakTest: {
        description: "50 payments/sec for 24 hours",
        target: 50,
        duration: 86400,
        expectedMemoryLeak: false,
        expectedIdempotencyCacheSize: "< 100000",
    },

    /** Chaos: RPC failure injection */
    chaosRpc: {
        description: "RPC becomes unavailable mid-test, circuit breaker should activate",
        target: 10,
        failureInjection: {
            type: "rpc_unavailable",
            startAfter: 30, // seconds
            duration: 120, // seconds
        },
        expectedBehavior: "Circuit breaker opens, payments rejected with clear error",
    },

    /** Chaos: rate limiter saturation */
    chaosRateLimit: {
        description: "Exceed rate limiter capacity, verify graceful degradation",
        target: 100, // exceeds 5/sec payment rate limit
        expectedBehavior: "Rate limiter rejects excess, no crashes",
    },

    /** Recovery: circuit breaker auto-recovery */
    recoveryTest: {
        description: "RPC recovers after outage, circuit breaker auto-closes",
        failureDuration: 60,
        recoveryWait: 30,
        expectedBehavior: "Circuit transitions OPEN -> HALF_OPEN -> CLOSED",
    },
};

/**
 * Metrics to monitor during load tests:
 *
 * - agentpay_payments_total (by token, status)
 * - agentpay_payment_latency_seconds (p50, p95, p99)
 * - agentpay_policy_violations_total
 * - agentpay_circuit_breaker_state
 * - agentpay_pending_transactions
 * - agentpay_active_agents
 * - process_cpu_usage
 * - process_memory_usage
 * - nodejs_eventloop_lag
 */

export default LOAD_TEST_SCENARIOS;