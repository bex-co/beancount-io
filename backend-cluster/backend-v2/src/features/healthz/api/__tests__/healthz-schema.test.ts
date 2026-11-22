import { healthCheckResponseSchema } from "../healthz-schema";

const validResponse = {
  status: "healthy",
  services: {
    postgres: { status: "healthy", latency_ms: 2 },
    redis: { status: "healthy", latency_ms: 1 },
    ledger: { status: "healthy", latency_ms: 15 },
    gitea: { status: "healthy", latency_ms: 10 },
  },
};

describe("Health Schema", () => {
  describe("healthCheckResponseSchema", () => {
    it("should accept a valid healthy response", () => {
      const result = healthCheckResponseSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it("should accept a response with unhealthy service and error", () => {
      const result = healthCheckResponseSchema.safeParse({
        status: "unhealthy",
        services: {
          postgres: { status: "healthy", latency_ms: 2 },
          redis: { status: "unhealthy", latency_ms: 5000, error: "timeout" },
          ledger: { status: "healthy", latency_ms: 15 },
          gitea: { status: "healthy", latency_ms: 10 },
        },
      });
      expect(result.success).toBe(true);
    });

    it("should reject a plain string", () => {
      const result = healthCheckResponseSchema.safeParse("OK");
      expect(result.success).toBe(false);
    });

    it("should reject null", () => {
      const result = healthCheckResponseSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it("should reject missing services", () => {
      const result = healthCheckResponseSchema.safeParse({
        status: "healthy",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid status values", () => {
      const result = healthCheckResponseSchema.safeParse({
        ...validResponse,
        status: "unknown",
      });
      expect(result.success).toBe(false);
    });

    it("should reject a missing service", () => {
      const { gitea: _, ...servicesWithoutGitea } = validResponse.services;
      const result = healthCheckResponseSchema.safeParse({
        status: "healthy",
        services: servicesWithoutGitea,
      });
      expect(result.success).toBe(false);
    });
  });
});
