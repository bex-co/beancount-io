import { z } from "@/shared/zod-openapi-setup";

// === Metrics Authentication ===

export const metricsHeadersSchema = z
  .object({
    "x-api-key": z.string().openapi({
      description:
        "API key for accessing metrics endpoints. Can also be provided as Authorization Bearer token.",
      example: "abcdefghijklmnopqrstuvwxyz0123456789",
    }),
  })
  .openapi("MetricsHeaders");

// === Backend Metrics Endpoint ===

export const backendMetricsResponseSchema = z
  .string()
  .openapi("BackendMetricsResponse", {
    description: `Prometheus metrics in text exposition format for the Node.js backend.

Includes metrics such as:
- HTTP request counters and histograms
- Process metrics (CPU, memory, event loop lag)
- Node.js runtime metrics
- Custom business metrics

Format: Prometheus text format (version 0.0.4)
Content-Type: text/plain; version=0.0.4; charset=utf-8`,
    example: `# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api-gateway/"} 1234

# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 123.45`,
  });

export const backendMetricsErrorResponseSchema = z
  .string()
  .openapi("BackendMetricsErrorResponse", {
    description: "Error message when metrics generation fails",
    example: "Error generating metrics: Internal server error",
  });

// === Ledger Metrics Endpoint ===

export const ledgerMetricsResponseSchema = z
  .string()
  .openapi("LedgerMetricsResponse", {
    description: `Prometheus metrics in text exposition format proxied from the Python ledger service.

Includes metrics such as:
- Ledger operation counters (parse, validate, query)
- Python process metrics
- FastAPI request metrics
- Beancount-specific metrics

Format: Prometheus text format (version 0.0.4)
Content-Type: text/plain; version=0.0.4; charset=utf-8`,
    example: `# HELP ledger_operations_total Total number of ledger operations
# TYPE ledger_operations_total counter
ledger_operations_total{operation="parse"} 567

# HELP ledger_parse_duration_seconds Time spent parsing ledger files
# TYPE ledger_parse_duration_seconds histogram
ledger_parse_duration_seconds_bucket{le="0.1"} 450
ledger_parse_duration_seconds_bucket{le="0.5"} 550
ledger_parse_duration_seconds_bucket{le="+Inf"} 567`,
  });

export const ledgerMetricsErrorResponseSchema = z
  .string()
  .openapi("LedgerMetricsErrorResponse", {
    description: "Error message when upstream metrics fetch fails",
    example: "Error proxying upstream metrics: Service unavailable",
  });

// === Metrics Authentication Error ===

export const metricsUnauthorizedResponseSchema = z
  .string()
  .openapi("MetricsUnauthorizedResponse", {
    description: "Error message for unauthorized access to metrics endpoints",
    example: "Unauthorized: Invalid or missing API token",
  });
