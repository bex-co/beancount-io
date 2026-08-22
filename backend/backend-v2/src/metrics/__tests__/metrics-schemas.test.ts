import {
  metricsHeadersSchema,
  backendMetricsResponseSchema,
  backendMetricsErrorResponseSchema,
  ledgerMetricsResponseSchema,
  ledgerMetricsErrorResponseSchema,
  metricsUnauthorizedResponseSchema,
} from "../metrics-schemas";

describe("Metrics Schemas", () => {
  describe("metricsHeadersSchema", () => {
    it("should accept valid API key header", () => {
      const result = metricsHeadersSchema.safeParse({
        "x-api-key": "abcdefghijklmnopqrstuvwxyz0123456789",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data["x-api-key"]).toBe(
          "abcdefghijklmnopqrstuvwxyz0123456789",
        );
      }
    });

    it("should require x-api-key", () => {
      const result = metricsHeadersSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("should reject non-string API key", () => {
      const result = metricsHeadersSchema.safeParse({
        "x-api-key": 12345,
      });
      expect(result.success).toBe(false);
    });

    it("should accept empty API key (server will validate)", () => {
      const result = metricsHeadersSchema.safeParse({
        "x-api-key": "",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("backendMetricsResponseSchema", () => {
    it("should accept valid Prometheus metrics format", () => {
      const metrics = `# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api-gateway/"} 1234`;
      const result = backendMetricsResponseSchema.safeParse(metrics);
      expect(result.success).toBe(true);
    });

    it("should accept empty string", () => {
      const result = backendMetricsResponseSchema.safeParse("");
      expect(result.success).toBe(true);
    });

    it("should reject non-string values", () => {
      const result = backendMetricsResponseSchema.safeParse({
        metrics: "data",
      });
      expect(result.success).toBe(false);
    });

    it("should reject number", () => {
      const result = backendMetricsResponseSchema.safeParse(123);
      expect(result.success).toBe(false);
    });
  });

  describe("backendMetricsErrorResponseSchema", () => {
    it("should accept valid error message", () => {
      const result = backendMetricsErrorResponseSchema.safeParse(
        "Error generating metrics: Internal server error",
      );
      expect(result.success).toBe(true);
    });

    it("should accept empty error message", () => {
      const result = backendMetricsErrorResponseSchema.safeParse("");
      expect(result.success).toBe(true);
    });

    it("should reject non-string values", () => {
      const result = backendMetricsErrorResponseSchema.safeParse({
        error: "message",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ledgerMetricsResponseSchema", () => {
    it("should accept valid ledger metrics format", () => {
      const metrics = `# HELP ledger_operations_total Total number of ledger operations
# TYPE ledger_operations_total counter
ledger_operations_total{operation="parse"} 567`;
      const result = ledgerMetricsResponseSchema.safeParse(metrics);
      expect(result.success).toBe(true);
    });

    it("should accept empty string", () => {
      const result = ledgerMetricsResponseSchema.safeParse("");
      expect(result.success).toBe(true);
    });

    it("should reject non-string values", () => {
      const result = ledgerMetricsResponseSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });

  describe("ledgerMetricsErrorResponseSchema", () => {
    it("should accept valid error message", () => {
      const result = ledgerMetricsErrorResponseSchema.safeParse(
        "Error proxying upstream metrics: Service unavailable",
      );
      expect(result.success).toBe(true);
    });

    it("should accept empty error message", () => {
      const result = ledgerMetricsErrorResponseSchema.safeParse("");
      expect(result.success).toBe(true);
    });

    it("should reject non-string values", () => {
      const result = ledgerMetricsErrorResponseSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });
  });

  describe("metricsUnauthorizedResponseSchema", () => {
    it("should accept valid unauthorized message", () => {
      const result = metricsUnauthorizedResponseSchema.safeParse(
        "Unauthorized: Invalid or missing API token",
      );
      expect(result.success).toBe(true);
    });

    it("should accept empty message", () => {
      const result = metricsUnauthorizedResponseSchema.safeParse("");
      expect(result.success).toBe(true);
    });

    it("should reject non-string values", () => {
      const result = metricsUnauthorizedResponseSchema.safeParse({ ok: false });
      expect(result.success).toBe(false);
    });
  });
});
