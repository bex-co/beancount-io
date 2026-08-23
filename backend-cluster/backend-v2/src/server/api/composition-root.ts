import Router from "@koa/router";
import type http from "http";
import type { GraphQLSchema } from "graphql";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ZodTypeAny } from "zod";

import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { logger } from "@/shared/logger";

import { restErrorMiddleware } from "@/server/rest/error-middleware";
import { restIdentityMiddleware } from "@/server/rest/identity-middleware";
import { restScopeMiddleware } from "@/server/rest/scope-middleware";
import { setOpenApiRoutes } from "@/server/rest/openapi-routes";
import {
  buildGraphqlSchema,
  registerGraphqlSdlRoute,
  registerGraphqlTransport,
} from "@/server/graphql/api-gateway";
import { buildResolverContainer } from "@/server/graphql/resolver-registry";

import { setOidcRoutes } from "@/features/oauth/api/oidc-route";
import { setHealthzHandler } from "@/features/healthz/api/healthz-handler";
import { setMetricHandler } from "@/metrics";
import { setAdminApiRoute } from "@/features/admin/api/admin-api-handler";
import { setStripeWebhookHandler } from "@/features/stripe/api/stripe-webhook-handler";
import { setPlaidWebhookHandler } from "@/features/plaid/api/rest/plaid-webhook-handler";
import { setV1CompatRedirectRoutes } from "@/features/v1-compat/api/redirect-handler";
import { setLedgerApiHandler } from "@/features/ledger/api/rest/ledger-api-handler";
import {
  setLedgerV1Routes,
  setLedgerV1TicketRoutes,
} from "@/features/ledger/api/rest/v1";
import { setSitemapHandler } from "@/features/sitemap/api/sitemap-handler";
import { setMcpRoute, setupAiAgentRoutes } from "@/features/ai-agent/api";
import { setGitProxyHandler } from "@/features/gitea/api/git-proxy-handler";
import { MCP_TOOLS } from "@/features/ai-agent/api/mcp-tools";
import type { ToolContext } from "@/features/ai-agent/tools/types";

import { gqlOpId, mcpOpId, requireScopeClass, restOpId } from "./op-class";
import { normalizeRestPath, opMethodsForLayer } from "./rest-op-id";

const mcpLogger = logger.child({ module: "mcp-registry" });

/**
 * The composition root (ADR 0006 D1).
 *
 * Three surfaces, one place each is born: one REST router, one GraphQL schema,
 * one MCP registry. Features contribute registration fragments and never stand
 * up a server of their own; the root imports features, and no feature imports
 * the root — which is what keeps the graph acyclic and lets the guard tests in
 * `__tests__/` introspect the whole API without booting it.
 *
 * Before this existed, the three were assembled in three unrelated places: a
 * per-feature call list for REST, a separate Apollo bootstrap for GraphQL, and
 * an `McpServer` constructed inline inside the MCP route handler. Nothing could
 * answer "every op this process serves", so nothing could check the three
 * against each other — which is why the surfaces drifted (ADR 0006 problem 6).
 */

/** Everything a registration fragment may need. */
export interface ApiDeps {
  readonly layers: AppLayers;
  readonly config: AppConfig;
}

/**
 * Whether a mount sits under the scope gate.
 *
 * - `scoped` — the op-class matrix applies; the caller's scopes are checked
 *   against the op's class, at whatever strength `config.api.scopeEnforcement`
 *   is currently set to.
 * - `enforced` — the matrix applies and *denies*, whatever the global setting.
 *   For a surface with no clients yet: shadow mode exists so that
 *   misclassifying a live op cannot refuse somebody's working integration, and
 *   a surface published for the first time has no working integrations to
 *   protect. Publishing a documented scope model that does not actually refuse
 *   would be the worse risk (w1/m21, the v1 REST surface).
 * - `outside` — the matrix does not apply, and the mount owes the always-public
 *   census a reason why (ADR 0006 D9 test 3). Webhooks authenticated by
 *   signature, the OIDC ceremony, liveness probes, and the surface transports
 *   whose own ops are gated one level in all live here.
 */
export type ApiGate = "scoped" | "enforced" | "outside";

/** A feature's REST contribution: routes, plus where they sit w.r.t. the gate. */
export interface RestFragment {
  readonly feature: string;
  readonly gate: ApiGate;
  register(router: Router, deps: ApiDeps): void;
}

/** One live REST mount, as read back off the assembled router. */
export interface RestMount {
  readonly feature: string;
  readonly gate: ApiGate;
  /** Uppercase HTTP method, or `ALL` for a method-agnostic mount. */
  readonly method: string;
  /** Path with `{param}` placeholders. */
  readonly path: string;
  /** `REST <METHOD> <path>` (ADR 0006 D3). */
  readonly opId: string;
}

/**
 * The REST fragments, in registration order — which is also matching order, so
 * this list is behaviour, not just bookkeeping (the OIDC interaction routes
 * must precede the OIDC catch-all).
 */
export const REST_FRAGMENTS: readonly RestFragment[] = [
  {
    // OAuth 2.1 + OIDC provider: dynamic client registration for MCP/AI-agent
    // clients, plus the static client for third-party identity login.
    feature: "oauth",
    gate: "outside",
    register: (router, { layers, config }) =>
      setOidcRoutes(router, layers, config),
  },
  {
    feature: "healthz",
    gate: "outside",
    register: (router, { layers, config }) =>
      setHealthzHandler(router, layers, config),
  },
  {
    // OpenAPI spec + Swagger UI. Registers nothing in production (w1/m21 makes
    // the public half production-visible).
    feature: "openapi",
    gate: "outside",
    register: (router, { config }) => setOpenApiRoutes(router, config),
  },
  {
    feature: "metrics",
    gate: "outside",
    register: (router, { config }) => setMetricHandler(router, config),
  },
  {
    feature: "admin",
    gate: "outside",
    register: (router, { layers, config }) =>
      setAdminApiRoute(router, layers, config),
  },
  {
    feature: "stripe",
    gate: "outside",
    register: (router, { layers }) => setStripeWebhookHandler(router, layers),
  },
  {
    feature: "plaid",
    gate: "outside",
    register: (router, { layers }) => setPlaidWebhookHandler(router, layers),
  },
  {
    feature: "v1-compat",
    gate: "outside",
    register: (router, { layers, config }) =>
      setV1CompatRedirectRoutes(router, layers, config),
  },
  {
    feature: "ledger",
    gate: "scoped",
    register: (router, { layers, config }) =>
      setLedgerApiHandler(router, layers, config),
  },
  {
    // The v1 REST surface (ADR 0006 D7). Enforced rather than shadowed: it is
    // published with a documented scope model and has no existing clients that
    // a misclassification could break.
    feature: "ledger-v1",
    gate: "enforced",
    register: (router, { layers, config }) =>
      setLedgerV1Routes(router, layers, config),
  },
  {
    // The archive download. Outside the gate because the request carries a
    // single-use ticket instead of a caller identity — a browser following a
    // download link cannot attach a bearer token. The authenticated,
    // scope-checked half is the mint endpoint in the fragment above.
    feature: "ledger-v1-archive",
    gate: "outside",
    register: (router, { layers, config }) =>
      setLedgerV1TicketRoutes(router, layers, config),
  },
  {
    feature: "sitemap",
    gate: "outside",
    register: (router, { layers, config }) =>
      setSitemapHandler(router, layers, config),
  },
  {
    // The MCP transport. Outside the REST matrix on purpose: one HTTP request
    // carries a whole JSON-RPC conversation, so the class of the request is not
    // the class of what it asks for — the gate runs per tool call, inside
    // `assembleMcpRegistry`.
    //
    // Registered ahead of the AI streaming routes so that `setupAiAgentRoutes`'s
    // trailing `allowedMethods()` layer stays the last of the group, exactly
    // where it sat when MCP lived inside that sub-router. Its 405/501 logic runs
    // after `next()`, so a terminal handler that never calls `next()` — which is
    // every route here — must sit downstream of it, not upstream.
    feature: "ai-agent-mcp",
    gate: "outside",
    register: (router, { layers, config }) =>
      setMcpRoute(router, layers, config, (toolCtx) =>
        assembleMcpRegistry(toolCtx, config),
      ),
  },
  {
    feature: "ai-agent",
    gate: "scoped",
    register: (router, { layers, config }) =>
      setupAiAgentRoutes(router, layers, config),
  },
  {
    // Git over HTTP. Outside the matrix because it authenticates with git's own
    // basic-auth credentials, which the proxy translates to Gitea's.
    feature: "gitea-git-proxy",
    gate: "outside",
    register: (router, { layers, config }) =>
      setGitProxyHandler(router, layers, config),
  },
];

// ---------------------------------------------------------------------------
// REST assembly + enumeration
// ---------------------------------------------------------------------------

/**
 * Assemble the one REST router and report what got mounted.
 *
 * The manifest is read back off the router after registration rather than
 * declared alongside it: a hand-written list of routes is exactly the thing
 * that drifts, and drift is what this milestone exists to make impossible.
 */
export function assembleRestRouter(router: Router, deps: ApiDeps): RestMount[] {
  // The gate index the scope middleware reads. It is handed over empty and
  // filled by the loop below, because the middleware has to be registered
  // ahead of the routes it guards (Koa matches layers in registration order)
  // while its contents are only known once those routes exist. Registration
  // finishes long before the first request, so the middleware never sees it
  // half-built.
  const gates = new Map<string, ApiGate>();

  // Outermost: the error adapter, so it wraps every route below. Then the
  // identity resolver (non-blocking — public routes simply see no caller), then
  // the scope gate, which needs the identity the previous one published.
  router.use(restErrorMiddleware());
  router.use(restIdentityMiddleware(deps.layers, deps.config));
  router.use(restScopeMiddleware(deps.config, gates));

  const mounts: RestMount[] = [];
  for (const fragment of REST_FRAGMENTS) {
    const before = router.stack.length;
    fragment.register(router, deps);
    for (const mount of collectMounts(router, before, fragment)) {
      mounts.push(mount);
      gates.set(mount.opId, mount.gate);
    }
  }
  return mounts;
}

function collectMounts(
  router: Router,
  fromIndex: number,
  fragment: Pick<RestFragment, "feature" | "gate">,
): RestMount[] {
  const mounts: RestMount[] = [];
  for (const layer of router.stack.slice(fromIndex)) {
    // Middleware layers (`router.use`) carry no methods and are not ops.
    if (layer.methods.length === 0) continue;
    const path = normalizeRestPath(layer.path);
    for (const method of opMethodsForLayer(layer.methods)) {
      mounts.push({
        feature: fragment.feature,
        gate: fragment.gate,
        method,
        path,
        opId: restOpId(method, path),
      });
    }
  }
  return mounts;
}

// ---------------------------------------------------------------------------
// GraphQL enumeration
// ---------------------------------------------------------------------------

/** Every root field of the schema, as op ids (`GQL Query.x` / `GQL Mutation.y`). */
export function listGraphqlOps(schema: GraphQLSchema): string[] {
  const ops: string[] = [];
  const collect = (parent: "Query" | "Mutation", fields: object) => {
    for (const field of Object.keys(fields)) {
      ops.push(gqlOpId(`${parent}.${field}`));
    }
  };
  const query = schema.getQueryType();
  if (query) collect("Query", query.getFields());
  const mutation = schema.getMutationType();
  if (mutation) collect("Mutation", mutation.getFields());
  return ops;
}

// ---------------------------------------------------------------------------
// MCP assembly + enumeration
// ---------------------------------------------------------------------------

/** Every tool in the MCP fragment, as op ids (`MCP <tool>`). */
export function listMcpOps(): string[] {
  return MCP_TOOLS.map((tool) => mcpOpId(tool.name));
}

/**
 * Assemble the one MCP registry for a caller.
 *
 * Per tool call, not per session: the scope gate runs inside the handler, so a
 * grant narrowed or revoked mid-session takes effect on the very next call —
 * the same reasoning that moved `authorizeLedger` into every tool in w1/m19.
 */
export function assembleMcpRegistry(
  toolCtx: ToolContext,
  config: AppConfig,
): McpServer {
  const server = new McpServer({ name: "beancount-mcp", version: "1.0.0" });

  for (const descriptor of MCP_TOOLS) {
    server.registerTool(
      descriptor.name,
      {
        title: descriptor.title,
        description: descriptor.description,
        inputSchema: descriptor.inputSchema,
      },
      makeMcpToolHandler(
        toolCtx,
        descriptor,
        config,
      ) as unknown as ToolCallback<ZodTypeAny>,
    );
  }

  return server;
}

function makeMcpToolHandler(
  toolCtx: ToolContext,
  descriptor: (typeof MCP_TOOLS)[number],
  config: AppConfig,
) {
  return async (input: never): Promise<CallToolResult> => {
    mcpLogger.info("MCP tool invoked", {
      tool: descriptor.name,
      ledgerId: toolCtx.ledgerId,
      userId: toolCtx.identity.userId,
    });
    try {
      // MCP's refusal dialect is an `isError` result, not a transport-level
      // status: the client is an agent mid-conversation, and a thrown HTTP
      // error would end the session instead of telling it what it lacks. The
      // catch below turns the ForbiddenError into exactly that.
      requireScopeClass(
        toolCtx.identity,
        mcpOpId(descriptor.name),
        config.api.scopeEnforcement,
      );
      const result = await descriptor.execute(toolCtx, input);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result as Record<string, unknown>,
      };
    } catch (err) {
      const text = err instanceof Error ? err.message : "Tool execution failed";
      mcpLogger.error("MCP tool execution failed", {
        tool: descriptor.name,
        error: text,
      });
      return { isError: true, content: [{ type: "text", text }] };
    }
  };
}

// ---------------------------------------------------------------------------
// Whole-API assembly
// ---------------------------------------------------------------------------

/** What one assembly produced, for the guard tests and for logging. */
export interface ApiManifest {
  readonly restMounts: readonly RestMount[];
  readonly graphqlOps: readonly string[];
  readonly mcpOps: readonly string[];
}

/**
 * Assemble all three surfaces onto one router. The single entry point
 * `start-server.ts` calls, and the only place the three are brought together.
 */
export async function assembleApi(
  httpServer: http.Server,
  router: Router,
  deps: ApiDeps,
): Promise<ApiManifest> {
  const { layers, config } = deps;

  const schema = await buildGraphqlSchema({
    container: buildResolverContainer(
      layers.services,
      layers.workflows,
      layers.database,
      layers.clients,
    ),
    scopeEnforcement: config.api.scopeEnforcement,
  });

  const restMounts: RestMount[] = [];

  // GraphQL is mounted before the REST middleware stack, as it always has been.
  // Koa matches layers in registration order, so `restErrorMiddleware` and the
  // scope gate do not wrap it — correct in both cases: Apollo formats its own
  // errors through `format-error.ts`, and GraphQL's scope gate is per root
  // field, inside the schema.
  //
  // The GraphQL mounts are REST-shaped too — they are HTTP routes on the same
  // router — so they are collected the same way, which is what puts them in
  // front of the always-public census rather than in a blind spot beside it.
  const beforeSdl = router.stack.length;
  registerGraphqlSdlRoute(router, schema);
  restMounts.push(
    ...collectMounts(router, beforeSdl, {
      feature: "graphql-sdl",
      gate: "outside",
    }),
  );

  const beforeTransport = router.stack.length;
  await registerGraphqlTransport(httpServer, router, schema, layers, config);
  restMounts.push(
    ...collectMounts(router, beforeTransport, {
      feature: "graphql-transport",
      gate: "outside",
    }),
  );

  restMounts.push(...assembleRestRouter(router, deps));

  return {
    restMounts,
    graphqlOps: listGraphqlOps(schema),
    mcpOps: listMcpOps(),
  };
}
