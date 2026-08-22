import http from "http";
import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import { config } from "@/config";
import { setHealthzHandler } from "@/api/healthz";
import { setLedgersHandler } from "@/api/ledgers";
import { setFilesHandler } from "@/api/files";
import { setAdminHandler } from "@/api/admin";
import { setTokensHandler } from "@/api/tokens";
import { setKeysHandler } from "@/api/keys";
import { setCollaboratorsHandler } from "@/api/collaborators";
import { setRepoHandler } from "@/api/repo";
import { setReportsHandler } from "@/api/reports";
import { setJournalHandler } from "@/api/journal";
import { setShellHandler } from "@/api/shell";
import { setEntriesHandler } from "@/api/entries";
import { setLegacyHandler } from "@/api/legacy";
import { setMetricsHandler } from "@/api/metrics";
import { restErrorMiddleware } from "@/server/error-middleware";

export function buildApp(): Koa {
  const app = new Koa();
  const router = new Router();

  app.use(restErrorMiddleware());
  app.use(bodyParser());

  setHealthzHandler(router);
  setLedgersHandler(router);
  setFilesHandler(router);
  setAdminHandler(router);
  setTokensHandler(router);
  setKeysHandler(router);
  setCollaboratorsHandler(router);
  setRepoHandler(router);
  setReportsHandler(router);
  setJournalHandler(router);
  setShellHandler(router);
  setEntriesHandler(router);
  setLegacyHandler(router);
  setMetricsHandler(router);

  app.use(router.routes() as unknown as Koa.Middleware);
  app.use(router.allowedMethods() as unknown as Koa.Middleware);
  return app;
}

export async function startServer(): Promise<http.Server> {
  const app = buildApp();
  const server = http.createServer(app.callback());

  await new Promise<void>((resolve) => {
    server.listen(config.port, () => resolve());
  });
  // eslint-disable-next-line no-console
  console.log(`beancount-ledger-v2 listening on :${config.port}`);

  const shutdown = () => {
    server.close(() => process.exit(0));
    // Force-exit if connections refuse to drain
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return server;
}
