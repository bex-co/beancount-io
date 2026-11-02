import Router from "@koa/router";
import {
  healthCheck,
  PROBE_DEADLINE_MS,
  resetHealthzProbeCache,
  setHealthzHandler,
} from "@/api/healthz";
import { RateLimitedError, ServiceUnavailableError } from "@/shared/errors";
import {
  HEALTH_DIRECTIVE_COUNT,
  HEALTH_ENTRY_POINT,
} from "@/foundation/rustledger/engine-health";

const parse = jest.fn();
jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger/engine-health"),
  getRustledgerWorkerPool: () => ({ parse }),
}));

const healthySnapshot = {
  valid: true,
  directiveCount: HEALTH_DIRECTIVE_COUNT,
  errors: [],
  options: {},
  directives: [],
};

/** Drive the registered `/healthz` route and report what it answered. */
async function callHealthz(): Promise<{ status: number; body: unknown }> {
  const router = new Router();
  setHealthzHandler(router);
  const layer = router.stack.find((entry) => entry.path === "/healthz");
  if (!layer) throw new Error("/healthz was not registered");
  const ctx = { status: 200, body: undefined as unknown };
  for (const middleware of layer.stack) {
    await (middleware as (c: typeof ctx) => Promise<void>)(ctx);
  }
  return ctx;
}

describe("healthCheck", () => {
  it("returns the Python-compatible success envelope", () => {
    const res = healthCheck();
    expect(res.success).toBe(true);
    expect(res.data.status).toBe("healthy");
    expect(new Date(res.data.timestamp).getTime()).not.toBeNaN();
  });

  it("reports unhealthy without changing the envelope shape", () => {
    const res = healthCheck(false);
    expect(res.success).toBe(true);
    expect(res.data.status).toBe("unhealthy");
    expect(Object.keys(res.data).sort()).toEqual(["status", "timestamp"]);
  });
});

describe("GET /healthz", () => {
  beforeEach(() => {
    parse.mockReset();
    resetHealthzProbeCache();
  });

  it("probes the engine through the worker pool", async () => {
    parse.mockResolvedValue(healthySnapshot);

    const { status, body } = await callHealthz();

    expect(status).toBe(200);
    expect(body).toMatchObject({ data: { status: "healthy" } });
    expect(parse).toHaveBeenCalledWith(
      expect.objectContaining({ [HEALTH_ENTRY_POINT]: expect.any(String) }),
      HEALTH_ENTRY_POINT,
      { applyTsPlugins: false },
    );
  });

  // The incident this closes: every real request 500s while a static /healthz
  // keeps reporting 200, so nothing ever restarts the container.
  it("answers 503 when the engine cannot parse", async () => {
    parse.mockRejectedValue(new Error("memory access out of bounds"));

    const { status, body } = await callHealthz();

    expect(status).toBe(503);
    expect(body).toMatchObject({ data: { status: "unhealthy" } });
  });

  it("answers 503 when the engine parses the probe wrongly", async () => {
    parse.mockResolvedValue({ ...healthySnapshot, valid: false });

    expect((await callHealthz()).status).toBe(503);
  });

  // Restarting a merely busy service drops in-flight work and makes the
  // backlog worse on every replacement, so saturation must stay "healthy".
  it.each([
    ["a full queue", new RateLimitedError(1, "capacity is full")],
    ["a timed-out task", new ServiceUnavailableError("RustLedger worker", 1)],
  ])("stays healthy on %s", async (_label, error) => {
    parse.mockRejectedValue(error);

    const { status, body } = await callHealthz();

    expect(status).toBe(200);
    expect(body).toMatchObject({ data: { status: "healthy" } });
  });

  // The pool only rejects when its queue is FULL; below that a probe waits
  // behind real work. Stalling past the orchestrator's own timeout would have
  // it restart a merely busy pod, so the route answers before that happens.
  it("answers healthy while a probe is still queued behind real work", async () => {
    jest.useFakeTimers();
    try {
      parse.mockReturnValue(new Promise(() => {}));

      const pending = callHealthz();
      await jest.advanceTimersByTimeAsync(PROBE_DEADLINE_MS);

      expect(await pending).toMatchObject({
        status: 200,
        body: { data: { status: "healthy" } },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it("records a slow probe's verdict for the next poll", async () => {
    jest.useFakeTimers();
    try {
      let land: (snapshot: unknown) => void = () => {};
      parse.mockReturnValue(
        new Promise((resolve) => {
          land = resolve;
        }),
      );

      const pending = callHealthz();
      await jest.advanceTimersByTimeAsync(PROBE_DEADLINE_MS);
      expect((await pending).status).toBe(200);

      // The abandoned probe lands unhealthy; the next poll must see it.
      land({ ...healthySnapshot, valid: false });
      await Promise.resolve();
      expect((await callHealthz()).status).toBe(503);
      // One probe total: the slow one was shared, never duplicated.
      expect(parse).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it("memoizes the probe so polling cannot flood the pool", async () => {
    parse.mockResolvedValue(healthySnapshot);

    await Promise.all([callHealthz(), callHealthz()]);
    await callHealthz();

    expect(parse).toHaveBeenCalledTimes(1);
  });
});
