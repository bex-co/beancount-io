import Router from "@koa/router";
import { sql } from "drizzle-orm";
import { type AppConfig } from "@/config/config";
import {
  type DatabaseLayer,
  type ClientFactoryLayer,
} from "@/foundation/composition";
import { registerRoute } from "@/server/rest/openapi-registry";
import { healthCheckResponseSchema } from "./healthz-schema";
import { logger } from "@/shared/logger";
import {
  AI_HEALTH_CHECK_CACHE_KEY,
  type AiHealthCheckResult,
} from "@/scheduler/jobs/ai-health-check-job";

const healthLogger = logger.child({ module: "healthz" });

type ServiceStatus = "healthy" | "unhealthy";

interface ServiceHealth {
  status: ServiceStatus;
  latency_ms: number;
  error?: string;
}

interface AiFeatureHealth {
  status: "healthy" | "unhealthy" | "unchecked";
  latency_ms: number;
  lastChecked?: string;
  error?: string;
}

interface HealthResponse {
  status: ServiceStatus;
  services: {
    postgres: ServiceHealth;
    redis: ServiceHealth;
    ledger: ServiceHealth;
    gitea: ServiceHealth;
    aiFeature: AiFeatureHealth;
  };
}

async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), timeoutMs),
    ),
  ]);
}

async function checkService(
  name: string,
  fn: () => Promise<void>,
): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await withTimeout(fn, 5000);
    return { status: "healthy", latency_ms: Date.now() - start };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    healthLogger.warn(`Health check failed for ${name}`, {
      error: errorMessage,
    });
    return {
      status: "unhealthy",
      latency_ms: Date.now() - start,
      error: errorMessage,
    };
  }
}

/**
 * Set up health check endpoint
 *
 * Deep health check that verifies connectivity to all backend dependencies
 * (PostgreSQL, Redis, Ledger, Gitea) and reads cached AI feature health.
 * Returns JSON with per-service status.
 * Returns 200 when all infrastructure services are healthy, 500 when any is unhealthy.
 * With ?strict=true, AI feature health also affects the HTTP status (soft dependency).
 * AI feature "unchecked" status (cron hasn't run yet) is always treated as OK.
 */
export function setHealthzHandler(
  router: Router,
  layers: { database: DatabaseLayer; clients: ClientFactoryLayer },
  config: AppConfig,
): void {
  router.get("/healthz", async (ctx) => {
    const [postgres, redis, ledger, gitea] = await Promise.all([
      checkService("postgres", async () => {
        await layers.database.db.execute(sql`SELECT 1`);
      }),
      checkService("redis", async () => {
        await layers.clients.cacheHelper.getStrict("__healthz__");
      }),
      checkService("ledger", async () => {
        const res = await fetch(`${config.favaApi.baseUrl}/healthz`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }),
      checkService("gitea", async () => {
        const url = `http://${config.gitea.internalHostname}:${config.gitea.httpPort}/api/healthz`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      }),
    ]);

    // Read cached AI feature health check result (set by cron job, not blocking)
    let aiFeature: AiFeatureHealth;
    try {
      const cached = await layers.clients.cacheHelper.get<AiHealthCheckResult>(
        AI_HEALTH_CHECK_CACHE_KEY,
      );
      if (cached) {
        aiFeature = {
          status: cached.status,
          latency_ms: cached.latency_ms,
          lastChecked: cached.lastChecked,
          ...(cached.error && { error: cached.error }),
        };
      } else {
        aiFeature = { status: "unchecked", latency_ms: 0 };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      healthLogger.warn("Failed to read AI health check cache", {
        error: errorMessage,
      });
      aiFeature = { status: "unchecked", latency_ms: 0, error: errorMessage };
    }

    const strict = ctx.query.strict === "true";
    const infraHealthy = [postgres, redis, ledger, gitea].every(
      (s) => s.status === "healthy",
    );
    const allHealthy =
      infraHealthy && (!strict || aiFeature.status !== "unhealthy");

    const response: HealthResponse = {
      status: allHealthy ? "healthy" : "unhealthy",
      services: { postgres, redis, ledger, gitea, aiFeature },
    };

    ctx.status = allHealthy ? 200 : 500;
    ctx.body = response;
  });

  // Register with OpenAPI documentation
  registerRoute({
    method: "get",
    path: "/healthz",
    summary: "Health check endpoint",
    description:
      "Deep health check that verifies connectivity to all backend dependencies (PostgreSQL, Redis, Ledger, Gitea) and reads cached AI feature health. Returns 200 when infrastructure services are healthy, 500 when any is unhealthy. Use ?strict=true to also fail on unhealthy AI feature.",
    tags: ["Health"],
    responses: {
      200: {
        description: "All services are healthy",
        content: {
          "application/json": {
            schema: healthCheckResponseSchema,
          },
        },
      },
      500: {
        description: "One or more services are unhealthy",
        content: {
          "application/json": {
            schema: healthCheckResponseSchema,
          },
        },
      },
    },
  });
}
