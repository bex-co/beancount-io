import Router from "@koa/router";
import {
  HEALTH_DIRECTIVE_COUNT,
  HEALTH_ENTRY_POINT,
  HEALTH_FILES,
  getRustledgerWorkerPool,
} from "@/foundation/rustledger";
import { RateLimitedError, ServiceUnavailableError } from "@/shared/errors";

export interface HealthCheck {
  status: string;
  timestamp: string;
}

export function healthCheck(engineHealthy = true): {
  success: true;
  data: HealthCheck;
} {
  return {
    success: true,
    data: {
      status: engineHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * How long a probe result stands. `/healthz` is the platform health check path
 * (`deploy/bex/README.md`), so it is polled continuously by every orchestrator
 * — without this the check would enqueue engine work on every poll and
 * compete with real requests for the one or two worker threads.
 */
const PROBE_TTL_MS = 5_000;

/**
 * How long the route waits for a probe before answering "busy, so healthy".
 *
 * The pool only REJECTS work when its queue is full; below that the probe is
 * queued and simply waits — behind up to 32 tasks, each allowed 120s. Without
 * a deadline a loaded service would stall `/healthz` past the orchestrator's
 * own timeout, and the platform would restart a pod that is merely busy,
 * dropping in-flight work and deepening the backlog on every replacement.
 *
 * The probe is not abandoned: it stays in flight and records its verdict when
 * it lands, so genuine sickness is still caught on a later poll.
 */
export const PROBE_DEADLINE_MS = 2_000;

let cached: { at: number; healthy: boolean } | undefined;
let inflight: Promise<boolean> | undefined;

/** Test hook: forget the memoized probe result. */
export function resetHealthzProbeCache(): void {
  cached = undefined;
  inflight = undefined;
}

/**
 * Whether the engine can still parse, through the worker pool — the same path
 * real requests take.
 *
 * This used to be a static 200. That is why a poisoned worker thread (see
 * `foundation/rustledger/engine-health.ts`) could 500 every real request for
 * 10.5 hours while the platform kept reporting the service healthy and never
 * restarted it. A check that does not touch the engine cannot see the only
 * failure mode that matters here.
 *
 * Saturation is NOT sickness. A full queue or a timed-out task means the pool
 * is busy, and answering "unhealthy" there would have the platform restart a
 * service that is merely under load — dropping in-flight work and making the
 * backlog worse on every replacement. Only a genuine engine failure, where the
 * pool accepts the probe and cannot parse one directive, reports unhealthy.
 */
async function engineHealthy(): Promise<boolean> {
  const now = Date.now();
  if (cached && now - cached.at < PROBE_TTL_MS) return cached.healthy;
  // Concurrent polls share one probe rather than queueing one task each.
  inflight ??= (async () => {
    let healthy: boolean;
    try {
      const snapshot = await getRustledgerWorkerPool().parse(
        HEALTH_FILES,
        HEALTH_ENTRY_POINT,
        { applyTsPlugins: false },
      );
      healthy =
        snapshot.valid && snapshot.directiveCount === HEALTH_DIRECTIVE_COUNT;
    } catch (error) {
      healthy =
        error instanceof RateLimitedError ||
        error instanceof ServiceUnavailableError;
    }
    cached = { at: Date.now(), healthy };
    inflight = undefined;
    return healthy;
  })();

  let timer: NodeJS.Timeout | undefined;
  const busy = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(true), PROBE_DEADLINE_MS);
    timer.unref();
  });
  try {
    return await Promise.race([inflight, busy]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function setHealthzHandler(router: Router): void {
  router.get("/healthz", async (ctx) => {
    const healthy = await engineHealthy();
    // 503 is what makes an orchestrator restart the container and an alert
    // fire; the 200 body shape is unchanged from the Python contract.
    if (!healthy) ctx.status = 503;
    ctx.body = healthCheck(healthy);
  });
}
