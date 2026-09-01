import http from "node:http";
import Koa from "koa";
import Router, { RouterContext } from "@koa/router";

import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import type { ApiGate } from "@/server/api/composition-root";
import type { Identity } from "@/server/api/identity";
import { restOpId } from "@/server/api/op-class";
import { normalizeRestPath, opMethodsForLayer } from "@/server/api/rest-op-id";
import { restErrorMiddleware } from "../error-middleware";
import { restScopeMiddleware } from "../scope-middleware";

import { setLedgerV1Routes } from "@/features/ledger/api/rest/v1";
import { setApiKeyRoutes } from "@/features/apikeys/api/api-key-rest";

/**
 * A real Koa server over the real v1 fragment.
 *
 * The v1 routes are worth testing through the whole middleware chain rather
 * than by calling handlers directly: most of what these tests assert — 401 for
 * no caller, 403 for the wrong scope, 400 for a body that does not match the
 * published schema — is produced by middleware the handler never sees. A test
 * that skipped the chain would pass while the surface refused nobody.
 *
 * Identity is injected rather than resolved: `resolveIdentity` has its own
 * tests (w1/m18), and minting real tokens here would test that instead of
 * this.
 */

/**
 * Which fragments the server under test should mount. Defaults to all of them,
 * because most tests want the surface as it actually ships.
 */
export interface V1TestFragments {
  ledger?: boolean;
  apiKeys?: boolean;
}

export interface V1TestServer {
  url: string;
  /** The caller every subsequent request is made as; `undefined` for anonymous. */
  setIdentity(identity: Identity | undefined): void;
  close(): Promise<void>;
}

export async function startV1TestServer(
  layers: AppLayers,
  config: AppConfig,
  fragments: V1TestFragments = { ledger: true, apiKeys: true },
): Promise<V1TestServer> {
  const router = new Router();
  let identity: Identity | undefined;

  const gates = new Map<string, ApiGate>();
  router.use(restErrorMiddleware());
  router.use(async (ctx: RouterContext, next: () => Promise<void>) => {
    ctx.state.identity = identity;
    await next();
  });
  router.use(restScopeMiddleware(config, gates));

  const before = router.stack.length;
  if (fragments.ledger !== false) setLedgerV1Routes(router, layers, config);
  if (fragments.apiKeys !== false) setApiKeyRoutes(router, layers, config);
  // The gate index the composition root builds at assembly time, rebuilt here
  // the same way — off the router, not off a second list that could disagree.
  router.stack.slice(before).forEach((layer) => {
    if (layer.methods.length === 0) return;
    for (const method of opMethodsForLayer(layer.methods)) {
      gates.set(
        restOpId(method, normalizeRestPath(layer.path)),
        "enforced" satisfies ApiGate,
      );
    }
  });

  const app = new Koa();
  app.silent = true;
  app.use(router.routes()).use(router.allowedMethods());

  const server = http.createServer(app.callback());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    url: `http://127.0.0.1:${port}`,
    setIdentity: (next) => {
      identity = next;
    },
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}

export const sessionIdentity: Identity = {
  userId: "usr_session",
  method: "session",
  scopes: new Set(),
};

export const readOnlyToken: Identity = {
  userId: "usr_token",
  method: "oauth",
  scopes: new Set(["ledger.read"]),
  tokenId: "tok_read",
};

export const writeToken: Identity = {
  ...readOnlyToken,
  scopes: new Set(["ledger.write"]),
  tokenId: "tok_write",
};

export const pinnedReadToken: Identity = {
  ...readOnlyToken,
  ledgerScope: "alice/main",
  tokenId: "tok_pinned_read",
};

export const scopelessToken: Identity = {
  ...readOnlyToken,
  scopes: new Set(),
  tokenId: "tok_none",
};
