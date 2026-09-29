import Router from "@koa/router";
import { setHealthzHandler } from "../healthz-handler";
import type {
  DatabaseLayer,
  ClientFactoryLayer,
} from "@/foundation/composition";
import type { AppConfig } from "@/config/config";

const mockWarn = jest.fn();
jest.mock("@/shared/logger", () => ({
  logger: {
    child: () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: (...args: unknown[]) => mockWarn(...args),
      error: jest.fn(),
    }),
  },
}));

describe("Healthz Handler", () => {
  let router: Router;
  let mockLayers: { database: DatabaseLayer; clients: ClientFactoryLayer };
  let mockConfig: AppConfig;

  beforeEach(() => {
    router = new Router();
    mockLayers = {
      database: {
        db: {} as any,
        models: {} as any,
      },
      clients: {
        cacheHelper: {} as any,
        favaClientFactory: {} as any,
        giteaClientFactory: {} as any,
        plaidClient: {} as any,
        sendgrid: {} as any,
      } as any,
    };
    mockConfig = {
      favaApi: { baseUrl: "http://ledger:8000" },
      gitea: { internalHostname: "gitea", httpPort: 3000 },
    } as AppConfig;
  });

  describe("setHealthzHandler", () => {
    it("should register GET /healthz route", () => {
      setHealthzHandler(router, mockLayers, mockConfig);

      const routes = router.stack;
      expect(routes).toHaveLength(1);
      expect(routes[0].path).toBe("/healthz");
      expect(routes[0].methods).toContain("GET");
    });
  });

  describe("GET /healthz failure logging", () => {
    let fetchMock: jest.Mock;
    let dbExecute: jest.Mock;
    let getStrict: jest.Mock;
    let cacheGet: jest.Mock;
    const originalFetch = global.fetch;

    async function runHealthz(query: Record<string, string> = {}) {
      setHealthzHandler(router, mockLayers, mockConfig);
      const handler = router.stack[0].stack[0];
      const ctx: any = { query, status: 404, body: undefined };
      await handler(ctx, async () => {});
      return ctx;
    }

    beforeEach(() => {
      mockWarn.mockReset();
      dbExecute = jest.fn().mockResolvedValue(undefined);
      getStrict = jest.fn().mockResolvedValue(null);
      cacheGet = jest.fn().mockResolvedValue(null);
      fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
      global.fetch = fetchMock as any;
      mockLayers.database.db = { execute: dbExecute } as any;
      mockLayers.clients.cacheHelper = { getStrict, get: cacheGet } as any;
      mockConfig = {
        favaApi: { baseUrl: "http://ledger:8000" },
        gitea: { internalBaseUrl: "http://gitea:3000" },
      } as AppConfig;
    });

    afterEach(() => {
      global.fetch = originalFetch;
      jest.useRealTimers();
    });

    it("logs nothing when every probe succeeds", async () => {
      const ctx = await runHealthz();

      expect(ctx.status).toBe(200);
      expect(ctx.body.status).toBe("healthy");
      expect(ctx.body.services.aiFeature).toEqual({
        status: "unchecked",
        latency_ms: 0,
      });
      expect(mockWarn).not.toHaveBeenCalled();
    });

    it("logs the upstream HTTP status for a failing ledger probe", async () => {
      fetchMock.mockImplementation(async (url: string) =>
        url.startsWith("http://ledger")
          ? { ok: false, status: 503 }
          : { ok: true, status: 200 },
      );

      const ctx = await runHealthz();

      expect(ctx.status).toBe(500);
      expect(ctx.body.services.ledger).toMatchObject({
        status: "unhealthy",
        error: "HTTP 503",
      });
      expect(mockWarn).toHaveBeenCalledTimes(1);
      expect(mockWarn).toHaveBeenCalledWith("Health check failed for ledger", {
        service: "ledger",
        reason: "HTTP 503",
        status: 503,
      });
    });

    it("logs the network error code without the error object", async () => {
      const cause = Object.assign(
        new Error("connect ECONNREFUSED 10.0.0.5:3000"),
        {
          code: "ECONNREFUSED",
        },
      );
      fetchMock.mockImplementation(async (url: string) => {
        if (url.startsWith("http://gitea")) {
          throw new TypeError("fetch failed", { cause });
        }
        return { ok: true, status: 200 };
      });

      await runHealthz();

      expect(mockWarn).toHaveBeenCalledWith("Health check failed for gitea", {
        service: "gitea",
        reason: "fetch failed",
        code: "ECONNREFUSED",
      });
    });

    it("logs a timeout without changing the five-second budget", async () => {
      jest.useFakeTimers();
      dbExecute.mockReturnValue(new Promise(() => {}));

      const pending = runHealthz();
      await jest.advanceTimersByTimeAsync(4999);
      expect(mockWarn).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);
      const ctx = await pending;

      expect(ctx.status).toBe(500);
      expect(ctx.body.services.postgres).toMatchObject({
        status: "unhealthy",
        error: "timeout",
      });
      expect(mockWarn).toHaveBeenCalledWith(
        "Health check failed for postgres",
        { service: "postgres", reason: "timeout" },
      );
    });

    it("bounds long multiline reasons to one line", async () => {
      const longMessage = `redis exploded\n${"x".repeat(500)}\n    at stack frame`;
      getStrict.mockRejectedValue(new Error(longMessage));

      const ctx = await runHealthz();

      expect(ctx.body.services.redis.error).toBe(longMessage);
      const [, meta] = mockWarn.mock.calls[0];
      expect(meta.service).toBe("redis");
      expect(meta.reason).not.toContain("\n");
      expect(meta.reason.startsWith("redis exploded x")).toBe(true);
      expect(meta.reason.length).toBeLessThanOrEqual(201);
      expect(meta.reason.endsWith("…")).toBe(true);
      expect(Object.keys(meta).sort()).toEqual(["reason", "service"]);
    });

    it("logs a compact cache-read failure and keeps AI health unchecked", async () => {
      cacheGet.mockRejectedValue(
        Object.assign(new Error("Connection is closed.\nretrying"), {
          code: "ECONNRESET",
        }),
      );

      const ctx = await runHealthz({ strict: "true" });

      expect(ctx.status).toBe(200);
      expect(ctx.body.services.aiFeature).toEqual({
        status: "unchecked",
        latency_ms: 0,
        error: "Connection is closed.\nretrying",
      });
      expect(mockWarn).toHaveBeenCalledTimes(1);
      expect(mockWarn).toHaveBeenCalledWith(
        "Failed to read AI health check cache",
        { reason: "Connection is closed. retrying", code: "ECONNRESET" },
      );
    });

    it("keeps strict mode failing on cached unhealthy AI without a warning", async () => {
      cacheGet.mockResolvedValue({
        status: "unhealthy",
        latency_ms: 12,
        lastChecked: "2026-09-27T00:00:00.000Z",
        error: "model unavailable",
      });

      expect((await runHealthz()).status).toBe(200);
      router = new Router();
      const strict = await runHealthz({ strict: "true" });

      expect(strict.status).toBe(500);
      expect(strict.body.services.aiFeature).toEqual({
        status: "unhealthy",
        latency_ms: 12,
        lastChecked: "2026-09-27T00:00:00.000Z",
        error: "model unavailable",
      });
      expect(mockWarn).not.toHaveBeenCalled();
    });
  });
});
