import "reflect-metadata";
import "dotenv/config";

import { config, type AppConfig } from "@/config/config";
import Koa from "koa";
import Router from "@koa/router";
import http from "http";

import bodyParser from "koa-bodyparser";
import cookie from "koa-cookie";
import cors from "@koa/cors";
import { restMetricsMiddleware } from "@/metrics/koa-middleware";
import { logger } from "@/shared/logger";
import { asyncContextMiddleware } from "./middleware/async-context-middleware";
import { createOrphanedHostCookieMiddleware } from "./middleware/orphaned-host-cookie-middleware";

import { buildAppLayers } from "@/foundation";
import { type AppLayers } from "@/foundation/composition";
import { assembleApi } from "./api/composition-root";
import { JobScheduler } from "@/scheduler";
import { SshProxyServer } from "@/features/gitea/ssh/ssh-proxy-server";
import { SshAuthenticator } from "@/features/gitea/ssh/ssh-authenticator";

const serverLogger = logger.child({ module: "start-server" });

export async function startServer(): Promise<void> {
  const app = new Koa();
  const httpServer = http.createServer(app.callback());
  const router = new Router();

  app.on("error", (err: Error, ctx: Koa.Context) => {
    serverLogger.error("Unhandled Koa error", {
      error: err.message,
      stack: err.stack,
      method: ctx.method,
      url: ctx.url,
      status: ctx.status,
    });
  });

  process.on("uncaughtException", (err: Error) => {
    serverLogger.error("Uncaught exception", {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason: unknown) => {
    serverLogger.error("Unhandled promise rejection", {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  app.proxy = config.server.proxy;
  const koaBodyParser = bodyParser({ jsonLimit: "1mb", formLimit: "56kb" });
  app.use(async (ctx, next) => {
    // oidc-provider core routes parse their own body from the raw stream.
    // Interaction routes (/interaction/*) still need bodyParser — our handlers read ctx.request.body there.
    const isOidcCore =
      ctx.path.startsWith("/api-gateway/oauth/") &&
      !ctx.path.startsWith("/api-gateway/oauth/interaction/");
    if (isOidcCore) return next();
    // Type cast: root @types/koa and @koa/router's bundled copy are structurally incompatible
    return koaBodyParser(
      ctx as unknown as Parameters<typeof koaBodyParser>[0],
      next,
    );
  });

  // Add async context middleware (must be early in the chain)
  // This enables automatic correlation ID propagation throughout the request
  app.use(asyncContextMiddleware);

  // Add cookie middleware
  app.use(cookie());

  // Update CORS to support credentials for cookie-based auth
  // Pattern-based origin matching (no env vars needed)
  app.use(
    cors({
      origin: (ctx) => {
        const origin = ctx.get("Origin");

        // If no origin header (same-origin request), allow it
        if (!origin) {
          return "*";
        }

        try {
          const url = new URL(origin);
          const hostname = url.hostname;

          // Allow any subdomain of beancount.io (production/staging)
          if (
            hostname === "beancount.io" ||
            hostname.endsWith(".beancount.io")
          ) {
            return origin;
          }

          // Allow localhost for development (any port)
          if (hostname === "localhost" || hostname === "127.0.0.1") {
            return origin;
          }

          // Reject other origins by returning empty string
          // This prevents the Access-Control-Allow-Origin header from being set
          return "";
        } catch {
          // Invalid origin URL, reject by returning empty string
          return "";
        }
      },
      credentials: true,
    }),
  );

  // Add metrics middleware for REST API
  app.use(restMetricsMiddleware());

  const layers: AppLayers = await buildAppLayers(config);

  // TEMPORARY (safe to delete after 2026-10-21) — retire the __Host-authSess
  // sessions stranded by the c8fee979d7 revert. See the middleware's docblock.
  //
  // Production-only: the __Host- prefix mandates Secure, and Koa's cookies
  // library throws "Cannot send secure cookie over unencrypted connection" on
  // plain HTTP. Development never issued this cookie name in the first place.
  if (config.env === "production") {
    app.use(
      createOrphanedHostCookieMiddleware(
        layers.database.models,
        layers.database.db,
      ),
    );
  }

  // Initialize scheduler at top level (infrastructure concern)
  const scheduler = new JobScheduler(layers, config);
  scheduler.start();

  // One composition root assembles all three surfaces onto this router
  // (ADR 0006 D1); the manifest it returns is what the drift guards in
  // `server/api/__tests__/` check the op-class table against.
  await assembleApi(httpServer, router, { layers, config });

  app.use(router.routes());
  app.use(router.allowedMethods());

  httpServer.listen(config.server.port, () => {
    logger.debug(`Server ready at http://localhost:${config.server.port}`);

    // Log Swagger UI URLs in non-production environments
    if (config.env !== "production") {
      logger.debug(
        `API Documentation (Swagger UI) available at http://localhost:${config.server.port}/api-docs`,
      );
      logger.debug(
        `Admin API Documentation (Swagger UI) available at http://localhost:${config.server.port}/api-admin-docs`,
      );
    }
  });

  // Git over SSH (ADR 0004). Off unless a host key is configured: taking over
  // :2222 with a key nobody has seen gives every existing client the same
  // warning a man-in-the-middle would, so it must be a deliberate switch.
  const sshProxy = await startSshProxy(layers, config);

  // Setup graceful shutdown
  setupGracefulShutdown(httpServer, scheduler, sshProxy);
}

async function startSshProxy(
  layers: AppLayers,
  config: AppConfig,
): Promise<SshProxyServer | null> {
  if (!config.sshProxy.enabled) return null;
  if (!config.sshProxy.hostKey) {
    // Worth being blunt: the compose file publishes this port and Gitea no
    // longer does, so without a host key nothing answers it and git over SSH is
    // down — a state that otherwise shows up only as "connection refused" on a
    // user's machine.
    logger.error(
      "SSH_PROXY_HOST_KEY is empty, so git over SSH is DOWN: the published port has no listener. " +
        "Set it to Gitea's host key (_infra/print-ssh-host-key.sh) and restart.",
      { port: config.sshProxy.port },
    );
    return null;
  }

  // `sshUrl` on the GraphQL Ledger type is built from GITEA_SSH_PORT, while the
  // listener binds SSH_PROXY_PORT. They are separate variables that have to
  // agree by hand, so drift would have us handing users an address nothing
  // serves — a failure that surfaces as an unexplained connection refused on
  // the client, far from its cause.
  if (config.gitea.sshPort !== config.sshProxy.port) {
    logger.warn(
      "advertised SSH port does not match the proxy's listening port",
      {
        advertised: config.gitea.sshPort,
        listening: config.sshProxy.port,
        hint: "GITEA_SSH_PORT is what sshUrl tells clients to use; set it to the published SSH_PROXY_PORT",
      },
    );
  }

  const server = new SshProxyServer(
    {
      port: config.sshProxy.port,
      hostKeys: [config.sshProxy.hostKey],
      gitea: {
        host: config.gitea.internalHostname,
        port: config.gitea.httpPort,
      },
      ledgerApiBaseUrl: config.favaApi.baseUrl,
    },
    new SshAuthenticator(
      layers.clients.giteaClientFactory,
      layers.database.models.user,
      layers.database.db,
    ),
    {
      models: layers.database.models,
      db: layers.database.db,
      stripe: layers.services.stripe,
      cacheHelper: layers.clients.cacheHelper,
    },
  );

  try {
    await server.listen();
    return server;
  } catch (err) {
    // A port already in use here means Gitea still holds it — surface that
    // rather than running with SSH silently unproxied.
    logger.error("failed to start the SSH proxy", {
      port: config.sshProxy.port,
      err: (err as Error).message,
    });
    throw err;
  }
}

/**
 * Setup graceful shutdown handlers for SIGTERM and SIGINT
 * Stops scheduler and closes HTTP server cleanly
 */
function setupGracefulShutdown(
  server: http.Server,
  scheduler: JobScheduler,
  sshProxy: SshProxyServer | null,
): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown`);

    // Stop scheduler first to prevent new job executions
    scheduler.stop();
    // Stop accepting SSH before the HTTP server goes, so a push in flight is
    // not cut off by the process exiting underneath it.
    void sshProxy?.close();

    // Stop HTTP server
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown hangs
    setTimeout(() => {
      logger.error("Forcing shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
