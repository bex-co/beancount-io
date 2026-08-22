import { Counter, Histogram, Gauge } from "prom-client";

// HTTP Request metrics
export const httpRequestDuration = new Histogram({
  name: `http_request_duration_seconds`,
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const httpRequestTotal = new Counter({
  name: `http_requests_total`,
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

export const httpRequestInProgress = new Gauge({
  name: `http_requests_in_progress`,
  help: "Number of HTTP requests currently being processed",
});

// GraphQL specific metrics
export const graphqlQueryDuration = new Histogram({
  name: `graphql_query_duration_seconds`,
  help: "Duration of GraphQL queries in seconds",
  labelNames: ["operation_name"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const graphqlQueryTotal = new Counter({
  name: `graphql_queries_total`,
  help: "Total number of GraphQL queries by result status",
  labelNames: ["operation_name", "status"],
});

export const graphqlQueryInProgress = new Gauge({
  name: `graphql_queries_in_progress`,
  help: "Number of GraphQL queries currently being processed",
});

// System metrics (additional to default)
export const memoryUsage = new Gauge({
  name: `memory_usage_bytes`,
  help: "Memory usage in bytes",
  labelNames: ["type"],
});

export const cpuUsage = new Gauge({
  name: `cpu_usage_percent`,
  help: "CPU usage percentage",
});

// Note: Error rates can be calculated from main counters using PromQL:
// HTTP error rate: rate(http_requests_total{status_code=~"4xx|5xx"}[5m]) / rate(http_requests_total[5m])
// GraphQL errors are tracked in application logs - use query duration/volume for performance monitoring
