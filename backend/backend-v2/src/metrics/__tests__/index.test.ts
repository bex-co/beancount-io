import "reflect-metadata";
import { register } from "prom-client";
import {
  updateSystemMetrics,
  getMetrics,
  startMetricsCollection,
  stopMetricsCollection,
} from "../index";
import { memoryUsage } from "../metrics-definitions";

// Mock the metrics definitions
jest.mock("../metrics-definitions", () => ({
  ...jest.requireActual("../metrics-definitions"),
  memoryUsage: {
    set: jest.fn(),
  },
}));

describe("Metrics Index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stopMetricsCollection();
  });

  afterEach(() => {
    stopMetricsCollection();
  });

  describe("updateSystemMetrics", () => {
    it("should update memory usage metrics", () => {
      updateSystemMetrics();

      expect(memoryUsage.set).toHaveBeenCalledWith(
        { type: "rss" },
        expect.any(Number),
      );
      expect(memoryUsage.set).toHaveBeenCalledWith(
        { type: "heapTotal" },
        expect.any(Number),
      );
      expect(memoryUsage.set).toHaveBeenCalledWith(
        { type: "heapUsed" },
        expect.any(Number),
      );
      expect(memoryUsage.set).toHaveBeenCalledWith(
        { type: "external" },
        expect.any(Number),
      );
      expect(memoryUsage.set).toHaveBeenCalledWith(
        { type: "arrayBuffers" },
        expect.any(Number),
      );
    });

    it("should use process.memoryUsage() values", () => {
      const mockMemoryUsage = {
        rss: 100000,
        heapTotal: 50000,
        heapUsed: 30000,
        external: 2000,
        arrayBuffers: 1000,
      };

      jest.spyOn(process, "memoryUsage").mockReturnValue(mockMemoryUsage);

      updateSystemMetrics();

      expect(memoryUsage.set).toHaveBeenCalledWith({ type: "rss" }, 100000);
      expect(memoryUsage.set).toHaveBeenCalledWith(
        { type: "heapTotal" },
        50000,
      );
      expect(memoryUsage.set).toHaveBeenCalledWith({ type: "heapUsed" }, 30000);
      expect(memoryUsage.set).toHaveBeenCalledWith({ type: "external" }, 2000);
      expect(memoryUsage.set).toHaveBeenCalledWith(
        { type: "arrayBuffers" },
        1000,
      );

      jest.restoreAllMocks();
    });
  });

  describe("getMetrics", () => {
    it("should return metrics from the registry", async () => {
      const metrics = await getMetrics();

      expect(typeof metrics).toBe("string");
      expect(metrics.length).toBeGreaterThan(0);
    });

    it("should include prometheus formatted metrics", async () => {
      const metrics = await getMetrics();

      // Check for typical prometheus metric format
      expect(metrics).toMatch(/# HELP/);
      expect(metrics).toMatch(/# TYPE/);
    });

    it("should return a Promise", () => {
      const result = getMetrics();
      expect(result).toBeInstanceOf(Promise);
    });

    it("should call register.metrics()", async () => {
      const metricsSpy = jest.spyOn(register, "metrics");
      await getMetrics();

      expect(metricsSpy).toHaveBeenCalled();

      metricsSpy.mockRestore();
    });
  });

  describe("startMetricsCollection", () => {
    it("should start metrics collection with default interval", () => {
      jest.useFakeTimers();

      const interval = startMetricsCollection();

      expect(interval).toBeDefined();

      jest.advanceTimersByTime(5000);
      expect(memoryUsage.set).toHaveBeenCalled();

      jest.clearAllMocks();
      jest.advanceTimersByTime(5000);
      expect(memoryUsage.set).toHaveBeenCalled();

      stopMetricsCollection();
      jest.useRealTimers();
    });

    it("should start metrics collection with custom interval", () => {
      jest.useFakeTimers();

      const interval = startMetricsCollection(1000);

      expect(interval).toBeDefined();

      jest.advanceTimersByTime(1000);
      expect(memoryUsage.set).toHaveBeenCalled();

      stopMetricsCollection();
      jest.useRealTimers();
    });

    it("should clear previous interval when called multiple times", () => {
      jest.useFakeTimers();

      const interval1 = startMetricsCollection(1000);
      const interval2 = startMetricsCollection(2000);

      expect(interval1).toBeDefined();
      expect(interval2).toBeDefined();

      // First interval should be cleared, second should work
      jest.advanceTimersByTime(1000);
      expect(memoryUsage.set).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000); // Total 2000ms
      expect(memoryUsage.set).toHaveBeenCalled();

      stopMetricsCollection();
      jest.useRealTimers();
    });

    it("should return NodeJS.Timeout", () => {
      const interval = startMetricsCollection();

      expect(interval).toBeDefined();
      expect(typeof interval).toBe("object");

      stopMetricsCollection();
    });
  });

  describe("stopMetricsCollection", () => {
    it("should stop metrics collection", () => {
      jest.useFakeTimers();

      startMetricsCollection(1000);
      stopMetricsCollection();

      jest.advanceTimersByTime(5000);
      expect(memoryUsage.set).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it("should handle being called when no interval is active", () => {
      expect(() => stopMetricsCollection()).not.toThrow();
    });

    it("should handle being called multiple times", () => {
      jest.useFakeTimers();

      startMetricsCollection(1000);
      stopMetricsCollection();
      stopMetricsCollection();

      jest.advanceTimersByTime(5000);
      expect(memoryUsage.set).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
