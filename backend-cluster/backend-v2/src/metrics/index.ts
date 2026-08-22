import { collectDefaultMetrics, register } from "prom-client";

// Import all metric definitions
export * from "./metrics-definitions";
import { memoryUsage, cpuUsage } from "./metrics-definitions";
import { config } from "@/config/config";

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  eventLoopMonitoringPrecision: 10,
});

// Store previous CPU usage for calculating percentage
let previousCpuUsage: NodeJS.CpuUsage | null = null;
let previousTimestamp: number | null = null;

// Function to update system metrics
export function updateSystemMetrics(): void {
  const memUsage = process.memoryUsage();

  memoryUsage.set({ type: "rss" }, memUsage.rss);
  memoryUsage.set({ type: "heapTotal" }, memUsage.heapTotal);
  memoryUsage.set({ type: "heapUsed" }, memUsage.heapUsed);
  memoryUsage.set({ type: "external" }, memUsage.external);
  memoryUsage.set({ type: "arrayBuffers" }, memUsage.arrayBuffers);

  // Update CPU usage percentage
  const currentCpuUsage = process.cpuUsage();
  const currentTimestamp = Date.now();

  if (previousCpuUsage && previousTimestamp) {
    // Calculate time elapsed in microseconds
    const timeElapsed = (currentTimestamp - previousTimestamp) * 1000;

    // Calculate CPU usage deltas in microseconds
    const userDelta = currentCpuUsage.user - previousCpuUsage.user;
    const systemDelta = currentCpuUsage.system - previousCpuUsage.system;

    // Calculate CPU percentage (total CPU time / elapsed time * 100)
    const cpuPercent = ((userDelta + systemDelta) / timeElapsed) * 100;

    cpuUsage.set(Math.min(cpuPercent, 100)); // Cap at 100%
  }

  previousCpuUsage = currentCpuUsage;
  previousTimestamp = currentTimestamp;
}

// Function to get all metrics
export function getMetrics(): Promise<string> {
  return register.metrics();
}

// Interval reference for system metrics collection
let metricsInterval: NodeJS.Timeout | null = null;

// Start system metrics collection
export function startMetricsCollection(
  intervalMs: number = 5000,
): NodeJS.Timeout {
  if (metricsInterval) {
    clearInterval(metricsInterval);
  }
  metricsInterval = setInterval(updateSystemMetrics, intervalMs);
  if (metricsInterval.unref) {
    metricsInterval.unref();
  }
  return metricsInterval;
}

// Stop system metrics collection
export function stopMetricsCollection(): void {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
  }
}

// Auto-start metrics collection in non-test environments
if (config.env === "production") {
  startMetricsCollection();
}

// Export business metrics utilities
export * from "./koa-middleware";
export * from "./apollo-plugin";
export * from "./metrics-api-handler";
