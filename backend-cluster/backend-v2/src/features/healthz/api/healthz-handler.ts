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

const healthLogger = logger.child({ module: "healthz" });

type ServiceStatus = "healthy" | "unhealthy";

interface ServiceHealth {
  status: ServiceStatus;
  latency_ms: number;
  error?: string;
}

interface HealthResponse {
  status: ServiceStatus;
  services: {
    postgres: ServiceHealth;
    redis: ServiceHealth;
    ledger: ServiceHealth;
    gitea: ServiceHealth;
  };
}

const PROBE_TIMEOUT_MS = 5000;

async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Thrown by HTTP probes so the warning can carry the upstream status. */
class HealthProbeHttpError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}

const MAX_LOGGED_REASON_LENGTH = 200;

/**
 * Compact log fields for a failed probe: a bounded single-line reason plus an
 * error code or HTTP status when one is known. Never the error object itself —
 * stacks, causes, and request/response dumps stay out of the routine warning.
 */
function describeHealthFailure(error: unknown): {
  reason: string;
  code?: string;
  status?: number;
} {
  const message = error instanceof Error ? error.message : String(error);
  const line = message.replace(/\s+/g, " ").trim() || "unknown error";
  const reason =
    line.length > MAX_LOGGED_REASON_LENGTH
      ? `${line.slice(0, MAX_LOGGED_REASON_LENGTH)}…`
      : line;
  if (error instanceof HealthProbeHttpError) {
    return { reason, status: error.status };
  }
  // Node network errors carry `code`; fetch wraps them in `cause`.
  const code =
    errorCode(error) ?? errorCode((error as { cause?: unknown })?.cause);
  return code ? { reason, code } : { reason };
}

/**
 * What the response says about a failed probe. The endpoint is anonymous and
 * public, and driver messages name internal hosts and addresses
 * (`connect ECONNREFUSED 10.0.0.5:5432`), so the body carries only a status,
 * `timeout`, or an error code; the full reason goes to the log.
 */
function publicFailure(error: unknown): string {
  if (error instanceof HealthProbeHttpError) return error.message;
  if (error instanceof Error && error.message === "timeout") return "timeout";
  return (
    errorCode(error) ??
    errorCode((error as { cause?: unknown })?.cause) ??
    "unavailable"
  );
}

function errorCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return typeof code === "string" && code.length <= 64 ? code : undefined;
}

async function checkService(
  name: string,
  fn: () => Promise<void>,
): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await withTimeout(fn, PROBE_TIMEOUT_MS);
    return { status: "healthy", latency_ms: Date.now() - start };
  } catch (error) {
    healthLogger.warn(`Health check failed for ${name}`, {
      service: name,
      ...describeHealthFailure(error),
    });
    return {
      status: "unhealthy",
      latency_ms: Date.now() - start,
      error: publicFailure(error),
    };
  }
}

// `/api-gateway/` is the prefix the public web host forwards to this service, so
// uptime monitors reach the check there without knowing the API's own host.
const HEALTHZ_PATHS = ["/healthz", "/api-gateway/healthz"] as const;

/**
 * Set up health check endpoint
 *
 * Deep health check that verifies connectivity to all backend dependencies
 * (PostgreSQL, Redis, Ledger, Gitea). Returns JSON with per-service status:
 * 200 when every service is healthy, 500 when any is unhealthy.
 */
export function setHealthzHandler(
  router: Router,
  layers: { database: DatabaseLayer; clients: ClientFactoryLayer },
  config: AppConfig,
): void {
  const healthz: Router.Middleware = async (ctx) => {
    const [postgres, redis, ledger, gitea] = await Promise.all([
      checkService("postgres", async () => {
        await layers.database.db.execute(sql`SELECT 1`);
      }),
      checkService("redis", async () => {
        await layers.clients.cacheHelper.getStrict("__healthz__");
      }),
      checkService("ledger", async () => {
        const res = await fetch(`${config.favaApi.baseUrl}/healthz`, {
          signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        });
        if (!res.ok) throw new HealthProbeHttpError(res.status);
      }),
      checkService("gitea", async () => {
        const url = `${config.gitea.internalBaseUrl}/api/healthz`;
        const res = await fetch(url, {
          signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        });
        if (!res.ok) throw new HealthProbeHttpError(res.status);
      }),
    ]);

    const allHealthy = [postgres, redis, ledger, gitea].every(
      (s) => s.status === "healthy",
    );

    const response: HealthResponse = {
      status: allHealthy ? "healthy" : "unhealthy",
      services: { postgres, redis, ledger, gitea },
    };

    ctx.status = allHealthy ? 200 : 500;
    ctx.body = response;
  };

  for (const path of HEALTHZ_PATHS) {
    router.get(path, healthz);
    registerRoute({
      method: "get",
      path,
      summary: "Health check endpoint",
      description:
        "Deep health check that verifies connectivity to all backend dependencies (PostgreSQL, Redis, Ledger, Gitea). Returns 200 when every service is healthy, 500 when any is unhealthy.",
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
}
