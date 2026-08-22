import Router from "@koa/router";
import { collectDefaultMetrics, register } from "prom-client";

collectDefaultMetrics();

/**
 * Prometheus scrape endpoint (backend-v2 proxies it at `/metrics/ledger`).
 * Metric names differ from the Python service by nature (Node vs CPython
 * runtimes) — this endpoint's parity status is "behavioral": both expose a
 * text/plain Prometheus exposition, contents are runtime-specific.
 */
export function setMetricsHandler(router: Router): void {
  router.get("/metrics", async (ctx) => {
    ctx.set("Content-Type", register.contentType);
    ctx.body = await register.metrics();
  });
}
