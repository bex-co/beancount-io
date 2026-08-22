import Router from "@koa/router";
import fetch from "node-fetch";
import { getMetrics } from "./index";
import { AppConfig } from "@/config/config";
import { logger } from "@/shared/logger";

const metricsAuthRequired = (apiKey: string): Router.Middleware => {
  return async (ctx, next: () => Promise<void>) => {
    if (!apiKey) {
      logger.warn("API key not configured, metrics endpoints are disabled");
      ctx.status = 404;
      ctx.body = "Not Found";
      return;
    }

    const providedApiKey =
      ctx.headers["x-api-key"] ||
      ctx.headers["authorization"]?.replace(/^Bearer\s+/i, "");

    if (!providedApiKey || providedApiKey !== apiKey) {
      ctx.status = 401;
      ctx.body = "Unauthorized: Invalid or missing API token";
      return;
    }

    await next();
  };
};

export function setMetricHandler(router: Router, config: AppConfig): void {
  // Node.js metrics endpoint

  router.get(
    "/metrics/backend",
    metricsAuthRequired(config.metricsApiToken),
    async (ctx) => {
      try {
        const metrics = await getMetrics();
        ctx.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
        ctx.body = metrics;
      } catch (error) {
        ctx.status = 500;
        ctx.body = `Error generating metrics: ${(error as Error).message}`;
      }
    },
  );

  // Upstream metrics endpoint (proxy to fava_api)
  router.get(
    "/metrics/ledger",
    metricsAuthRequired(config.metricsApiToken),
    async (ctx) => {
      try {
        const upstreamUrl = `${config.favaApi.baseUrl}/metrics`;
        logger.debug("Fetching ledger metrics from upstream", { upstreamUrl });
        const response = await fetch(upstreamUrl);

        if (!response.ok) {
          ctx.status = response.status;
          ctx.body = `Error fetching upstream metrics: ${response.statusText}`;
          return;
        }

        const metrics = await response.text();
        ctx.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
        ctx.body = metrics;
      } catch (error) {
        ctx.status = 500;
        ctx.body = `Error proxying upstream metrics: ${(error as Error).message}`;
      }
    },
  );

  // Note: Metrics endpoints are intentionally excluded from OpenAPI documentation for security reasons
}
