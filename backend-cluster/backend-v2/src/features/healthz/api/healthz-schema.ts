import { z } from "@/shared/zod-openapi-setup";

// === Health Check Endpoint ===

const serviceHealthSchema = z.object({
  status: z.enum(["healthy", "unhealthy"]),
  latency_ms: z.number(),
  error: z.string().optional(),
});

const aiFeatureHealthSchema = z.object({
  status: z.enum(["healthy", "unhealthy", "unchecked"]),
  latency_ms: z.number(),
  lastChecked: z.string().optional(),
  error: z.string().optional(),
});

export const healthCheckResponseSchema = z
  .object({
    status: z.enum(["healthy", "unhealthy"]),
    services: z.object({
      postgres: serviceHealthSchema,
      redis: serviceHealthSchema,
      ledger: serviceHealthSchema,
      gitea: serviceHealthSchema,
      aiFeature: aiFeatureHealthSchema,
    }),
  })
  .openapi("HealthCheckResponse", {
    description:
      "Health check response with per-service dependency status and latency",
  });
