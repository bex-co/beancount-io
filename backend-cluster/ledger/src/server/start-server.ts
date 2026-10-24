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
import { getRustledgerWorkerPool } from "@/foundation/rustledger";
import { requestContextMiddleware } from "@/server/request-context-middleware";
import { brotliBodyRefusal } from "@/server/brotli-body-refusal";
import { MAX_PROJECTED_BYTES } from "@/features/ledger/service/ledger-data-service";

/**
 * The largest body backend-v2 sends: the files a check projects, at most
 * MAX_PROJECTED_BYTES decoded, as base64 (4/3 as long) in JSON, with 1 MiB
 * for the envelope. 2 MiB refused a batch backend-v2's own 2 MiB request cap
 * admits, once its files were re-encoded (w23/074).
 */
export const JSON_BODY_LIMIT_BYTES =
  Math.ceil((MAX_PROJECTED_BYTES * 4) / 3) + 1024 * 1024;

export function buildApp(): Koa {
  const app = new Koa();
  const router = new Router();

  // Outermost, so the error middleware's own logging carries the request ID.
  app.use(requestContextMiddleware());
  app.use(restErrorMiddleware());
  // Before the parser, so no Brotli body reaches zlib's decoder.
  app.use(brotliBodyRefusal());
  app.use(bodyParser({ jsonLimit: String(JSON_BODY_LIMIT_BYTES) }));

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
  // The worker count decides whether a small ledger waits behind a large one,
  // so the deployed value is printed rather than inferred (w0/055).
  // eslint-disable-next-line no-console
  console.log(
    `beancount-ledger-v2 listening on :${config.port} (${getRustledgerWorkerPool().workerCount} rustledger workers)`,
  );

  const shutdown = () => {
    server.close(() => process.exit(0));
    // Force-exit if connections refuse to drain
    setTimeout(() => process.exit(0), 10_000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return server;
}
