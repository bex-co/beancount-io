import "reflect-metadata";
import Router from "@koa/router";
import fetch from "node-fetch";
import { setMetricHandler } from "../metrics-api-handler";
import { getMetrics } from "../index";
import { logger } from "@/shared/logger";

// Mock dependencies
jest.mock("node-fetch");
jest.mock("../index", () => ({
  getMetrics: jest.fn(),
}));
jest.mock("@/shared/logger", () => ({
  logger: {
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
const mockGetMetrics = getMetrics as jest.MockedFunction<typeof getMetrics>;

describe("Metrics API Handler", () => {
  let router: Router;
  let mockConfig: Partial<{
    metricsApiToken: string;
    favaApi: { baseUrl: string };
  }>;

  beforeEach(() => {
    jest.clearAllMocks();
    router = new Router();
    mockConfig = {
      metricsApiToken: "test-api-key",
      favaApi: {
        baseUrl: "http://localhost:5000",
      },
    };
  });

  describe("setMetricHandler", () => {
    it("should register /metrics/backend route", () => {
      setMetricHandler(router, mockConfig as never);

      const routes = router.stack.map((layer) => layer.path);
      expect(routes).toContain("/metrics/backend");
    });

    it("should register /metrics/ledger route", () => {
      setMetricHandler(router, mockConfig as never);

      const routes = router.stack.map((layer) => layer.path);
      expect(routes).toContain("/metrics/ledger");
    });
  });

  describe("/metrics/backend endpoint", () => {
    it("should return metrics when authenticated with valid API key", async () => {
      const mockMetrics = "# HELP test_metric\ntest_metric 1";
      mockGetMetrics.mockResolvedValue(mockMetrics);

      setMetricHandler(router, mockConfig as never);

      const ctx: Partial<Router.RouterContext> = {
        headers: { "x-api-key": "test-api-key" },
        set: jest.fn(),
      };

      const route = router.stack.find(
        (layer) => layer.path === "/metrics/backend",
      );
      await route!.stack[1](ctx as Router.RouterContext, jest.fn());

      expect(ctx.body).toBe(mockMetrics);
      expect(ctx.set).toHaveBeenCalledWith(
        "Content-Type",
        "text/plain; version=0.0.4; charset=utf-8",
      );
    });

    it("should return metrics when authenticated with Bearer token", async () => {
      const mockMetrics = "# HELP test_metric\ntest_metric 1";
      mockGetMetrics.mockResolvedValue(mockMetrics);

      setMetricHandler(router, mockConfig as never);

      const ctx: Partial<Router.RouterContext> = {
        headers: { authorization: "Bearer test-api-key" },
        set: jest.fn(),
      };

      const route = router.stack.find(
        (layer) => layer.path === "/metrics/backend",
      );
      await route!.stack[1](ctx as Router.RouterContext, jest.fn());

      expect(ctx.body).toBe(mockMetrics);
    });

    it("should return 401 when API key is missing", async () => {
      setMetricHandler(router, mockConfig as never);

      const ctx: Partial<Router.RouterContext> = {
        headers: {},
      };

      const route = router.stack.find(
        (layer) => layer.path === "/metrics/backend",
      );
      await route!.stack[0](ctx as Router.RouterContext, jest.fn());

      expect(ctx.status).toBe(401);
      expect(ctx.body).toBe("Unauthorized: Invalid or missing API token");
    });

    it("should return 401 when API key is invalid", async () => {
      setMetricHandler(router, mockConfig as never);

      const ctx: Partial<Router.RouterContext> = {
        headers: { "x-api-key": "wrong-key" },
      };

      const route = router.stack.find(
        (layer) => layer.path === "/metrics/backend",
      );
      await route!.stack[0](ctx as Router.RouterContext, jest.fn());

      expect(ctx.status).toBe(401);
      expect(ctx.body).toBe("Unauthorized: Invalid or missing API token");
    });

    it("should return 404 when API key is not configured", async () => {
      const configWithoutKey = {
        ...mockConfig,
        metricsApiToken: "",
      };

      setMetricHandler(router, configWithoutKey as never);

      const ctx: Partial<Router.RouterContext> = {
        headers: {},
      };

      const route = router.stack.find(
        (layer) => layer.path === "/metrics/backend",
      );
      await route!.stack[0](ctx as Router.RouterContext, jest.fn());

      expect(ctx.status).toBe(404);
      expect(ctx.body).toBe("Not Found");
      expect(logger.warn).toHaveBeenCalledWith(
        "API key not configured, metrics endpoints are disabled",
      );
    });

    it("should return 500 when getMetrics throws error", async () => {
      mockGetMetrics.mockRejectedValue(new Error("Metrics error"));

      setMetricHandler(router, mockConfig as never);

      const ctx: Partial<Router.RouterContext> = {
        headers: { "x-api-key": "test-api-key" },
        set: jest.fn(),
      };

      const route = router.stack.find(
        (layer) => layer.path === "/metrics/backend",
      );
      await route!.stack[1](ctx as Router.RouterContext, jest.fn());

      expect(ctx.status).toBe(500);
      expect(ctx.body).toBe("Error generating metrics: Metrics error");
    });

    it("should handle case-insensitive Bearer token", async () => {
      const mockMetrics = "# HELP test_metric\ntest_metric 1";
      mockGetMetrics.mockResolvedValue(mockMetrics);

      setMetricHandler(router, mockConfig as never);

      const ctx: Partial<Router.RouterContext> = {
        headers: { authorization: "bearer test-api-key" },
        set: jest.fn(),
      };

      const route = router.stack.find(
        (layer) => layer.path === "/metrics/backend",
      );
      await route!.stack[1](ctx as Router.RouterContext, jest.fn());

      expect(ctx.body).toBe(mockMetrics);
    });
  });

  describe("/metrics/ledger endpoint", () => {
    it("should proxy metrics from upstream when authenticated", async () => {
      const mockMetrics = "# HELP ledger_metric\nledger_metric 1";
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        text: jest.fn().mockResolvedValue(mockMetrics),
      };
      mockFetch.mockResolvedValue(mockResponse as never);

      setMetricHandler(router, mockConfig as never);

      const ctx: Partial<Router.RouterContext> = {
        headers: { "x-api-key": "test-api-key" },
        set: jest.fn(),
      };

      const route = router.stack.find(
        (layer) => layer.path === "/metrics/ledger",
      );
      await route!.stack[1](ctx as Router.RouterContext, jest.fn());

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:5000/metrics");
      expect(ctx.body).toBe(mockMetrics);
      expect(ctx.set).toHaveBeenCalledWith(
        "Content-Type",
        "text/plain; version=0.0.4; charset=utf-8",
      );
      expect(logger.debug).toHaveBeenCalledWith(
        "Fetching ledger metrics from upstream",
        { upstreamUrl: "http://localhost:5000/metrics" },
      );
    });

    it("should return 401 when API key is missing", async () => {
      setMetricHandler(router, mockConfig as never);

      const ctx: Partial<Router.RouterContext> = {
        headers: {},
      };

      const route = router.stack.find(
        (layer) => layer.path === "/metrics/ledger",
      );
      await route!.stack[0](ctx as Router.RouterContext, jest.fn());

      expect(ctx.status).toBe(401);
      expect(ctx.body).toBe("Unauthorized: Invalid or missing API token");
    });

    it("should handle upstream error response", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      };
      mockFetch.mockResolvedValue(mockResponse as never);

      setMetricHandler(router, mockConfig as never);

      const ctx: Partial<Router.RouterContext> = {
        headers: { "x-api-key": "test-api-key" },
        set: jest.fn(),
      };

      const route = router.stack.find(
        (layer) => layer.path === "/metrics/ledger",
      );
      await route!.stack[1](ctx as Router.RouterContext, jest.fn());

      expect(ctx.status).toBe(500);
      expect(ctx.body).toBe(
        "Error fetching upstream metrics: Internal Server Error",
      );
    });

    it("should handle network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      setMetricHandler(router, mockConfig as never);

      const ctx: Partial<Router.RouterContext> = {
        headers: { "x-api-key": "test-api-key" },
        set: jest.fn(),
      };

      const route = router.stack.find(
        (layer) => layer.path === "/metrics/ledger",
      );
      await route!.stack[1](ctx as Router.RouterContext, jest.fn());

      expect(ctx.status).toBe(500);
      expect(ctx.body).toBe("Error proxying upstream metrics: Network error");
    });

    it("should return 404 when API key is not configured", async () => {
      const configWithoutKey = {
        ...mockConfig,
        metricsApiToken: "",
      };

      setMetricHandler(router, configWithoutKey as never);

      const ctx: Partial<Router.RouterContext> = {
        headers: {},
      };

      const route = router.stack.find(
        (layer) => layer.path === "/metrics/ledger",
      );
      await route!.stack[0](ctx as Router.RouterContext, jest.fn());

      expect(ctx.status).toBe(404);
      expect(ctx.body).toBe("Not Found");
    });

    it("should handle different upstream base URLs", async () => {
      const mockMetrics = "# HELP ledger_metric\nledger_metric 1";
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: "OK",
        text: jest.fn().mockResolvedValue(mockMetrics),
      };
      mockFetch.mockResolvedValue(mockResponse as never);

      const customConfig = {
        ...mockConfig,
        favaApi: { baseUrl: "https://custom.example.com" },
      };

      setMetricHandler(router, customConfig as never);

      const ctx: Partial<Router.RouterContext> = {
        headers: { "x-api-key": "test-api-key" },
        set: jest.fn(),
      };

      const route = router.stack.find(
        (layer) => layer.path === "/metrics/ledger",
      );
      await route!.stack[1](ctx as Router.RouterContext, jest.fn());

      expect(mockFetch).toHaveBeenCalledWith(
        "https://custom.example.com/metrics",
      );
    });
  });
});
