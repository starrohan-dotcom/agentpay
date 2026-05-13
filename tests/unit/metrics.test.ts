import { describe, it, expect, beforeEach } from "vitest";
import { Counter, Gauge, Histogram } from "../../src/utils/metrics.js";

describe("Counter", () => {
    let counter: Counter;

    beforeEach(() => {
        counter = new Counter("test_counter", "Test counter metric");
    });

    it("should start at 0", () => {
        expect(counter.get()).toBe(0);
    });

    it("should increment by 1 by default", () => {
        counter.inc();
        expect(counter.get()).toBe(1);
    });

    it("should increment by custom value", () => {
        counter.inc({}, 5);
        expect(counter.get()).toBe(5);
    });

    it("should support labels", () => {
        counter.inc({ token: "ETH" }, 3);
        counter.inc({ token: "USDC" }, 2);

        expect(counter.get({ token: "ETH" })).toBe(3);
        expect(counter.get({ token: "USDC" })).toBe(2);
    });

    it("should output Prometheus format", () => {
        counter.inc({ token: "ETH" }, 1);

        const output = counter.toPrometheus();
        expect(output).toContain("# HELP test_counter");
        expect(output).toContain("# TYPE test_counter counter");
        expect(output).toContain('token="ETH"');
    });
});

describe("Gauge", () => {
    let gauge: Gauge;

    beforeEach(() => {
        gauge = new Gauge("test_gauge", "Test gauge metric");
    });

    it("should start at 0", () => {
        expect(gauge.get()).toBe(0);
    });

    it("should set to a specific value", () => {
        gauge.set({}, 42);
        expect(gauge.get()).toBe(42);
    });

    it("should increment and decrement", () => {
        gauge.inc({}, 5);
        expect(gauge.get()).toBe(5);

        gauge.dec({}, 2);
        expect(gauge.get()).toBe(3);
    });

    it("should support labels", () => {
        gauge.set({ status: "healthy" }, 1);
        gauge.set({ status: "unhealthy" }, 0);

        expect(gauge.get({ status: "healthy" })).toBe(1);
        expect(gauge.get({ status: "unhealthy" })).toBe(0);
    });

    it("should output Prometheus format", () => {
        gauge.set({}, 10);

        const output = gauge.toPrometheus();
        expect(output).toContain("# HELP test_gauge");
        expect(output).toContain("# TYPE test_gauge gauge");
        expect(output).toContain("test_gauge 10");
    });
});

describe("Histogram", () => {
    let histogram: Histogram;

    beforeEach(() => {
        histogram = new Histogram("test_histogram", "Test histogram", [0.1, 0.5, 1, 5]);
    });

    it("should observe values and place in correct buckets", () => {
        histogram.observe({}, 0.05); // <= 0.1
        histogram.observe({}, 0.3);  // <= 0.5
        histogram.observe({}, 2);    // <= 5
        histogram.observe({}, 10);   // +Inf

        const output = histogram.toPrometheus();
        expect(output).toContain("# HELP test_histogram");
        expect(output).toContain("# TYPE test_histogram histogram");
        expect(output).toContain("test_histogram_bucket");
        expect(output).toContain("test_histogram_sum");
        expect(output).toContain("test_histogram_count");
    });

    it("should track sum and count", () => {
        histogram.observe({}, 1);
        histogram.observe({}, 2);
        histogram.observe({}, 3);

        const output = histogram.toPrometheus();
        expect(output).toContain("test_histogram_sum 6");
        expect(output).toContain("test_histogram_count 3");
    });

    it("should support labels", () => {
        histogram.observe({ token: "ETH", status: "success" }, 0.5);
        histogram.observe({ token: "USDC", status: "success" }, 1.2);

        const output = histogram.toPrometheus();
        expect(output).toContain('token="ETH"');
        expect(output).toContain('token="USDC"');
    });

    it("should have +Inf bucket that captures everything", () => {
        histogram.observe({}, 100);

        const output = histogram.toPrometheus();
        expect(output).toContain('le="+Inf"');
    });
});