import type { ServerResponse } from "node:http";
import Router from "@koa/router";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { logger } from "@/shared/logger";
import { type AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import { OAUTH_CONFIG } from "@/features/oauth/data/config";
import type { McpRequestContext } from "./mcp-context";
import { resolveIdentity } from "@/server/api/identity";
import { setRouteRateLimitPolicy } from "@/server/api/rate-limit";
import { requestOpId } from "@/server/api/rest-op-id";
import { mcpRateLimitPolicy } from "./mcp-rate-policy";

const mcpLogger = logger.child({ module: "mcp-handler" });

/**
 * Builds the one MCP registry for a request's caller. Injected rather than
 * imported: the registry is assembled by the composition root, from this
 * feature's `MCP_TOOLS` fragment and with the scope gate wrapped round each
 * handler, and a feature that reached back into the root to get it would put a
 * cycle where the whole point is that there is none (ADR 0006 D1/参考实现 2).
 */
export type McpServerFactory = (toolCtx: McpRequestContext) => McpServer;

/**
 * Refuse the request the way the MCP authorization spec expects: 401 carrying
 * the RFC 9728 pointer to our protected-resource metadata, which is how an
 * unauthenticated client discovers the authorization server. Every refusal that
 * means "get a proper token" goes through here so the hint is never dropped.
 */
function refuseUnauthenticated(
  ctx: Router.RouterContext,
  config: AppConfig,
): void {
  ctx.set(
    "WWW-Authenticate",
    `Bearer resource_metadata="${config.oauth.issuer}/.well-known/oauth-protected-resource"`,
  );
  ctx.status = 401;
  ctx.body = { error: "unauthorized" };
}

async function handleMcpRequest(
  ctx: Router.RouterContext,
  layers: AppLayers,
  config: AppConfig,
  buildMcpServer: McpServerFactory,
): Promise<void> {
  // Authentication itself happens in the one shared gate (ADR 0006 D2); this
  // route only decides what an unacceptable MCP credential looks like on the
  // wire. Browser sessions are deliberately not an MCP credential — MCP clients
  // are agents that completed the OAuth ceremony — so a session is refused the
  // same way as no credential at all, discovery hint included, which is what
  // lets a browser-hosted client go get a real token.
  const identity = await resolveIdentity(ctx, layers.database, config, {
    oauthResource: OAUTH_CONFIG.resourceBindings.mcp,
  });
  if (!identity || identity.method === "session") {
    refuseUnauthenticated(ctx, config);
    return;
  }

  // GET and DELETE are refused here, before any transport exists.
  //
  // This endpoint is stateless (`sessionIdGenerator: undefined`, below): the
  // server and transport are built per request and thrown away, so there is no
  // session for a standalone SSE stream to belong to and no server-initiated
  // message that could ever reach one. The transport does not know that, and
  // answers GET by opening a stream it holds open forever — and because
  // `handleRequest` only resolves once that stream ends, the `finally` that
  // closes the server never runs. The observed result was a 200
  // `text/event-stream` that sent nothing and never closed, one leaked
  // McpServer per connection.
  //
  // 405 is what the Streamable HTTP spec prescribes for both: for GET when the
  // server offers no stream at this endpoint, and for DELETE when it does not
  // let clients terminate sessions. The routes stay registered so the answer
  // comes from here rather than from `allowedMethods()`, which would skip
  // authentication and hand an unauthenticated caller the same 405.
  if (ctx.method !== "POST") {
    ctx.set("Allow", "POST");
    ctx.status = 405;
    ctx.body = {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message:
          "Method Not Allowed: this MCP endpoint is stateless and serves POST only",
      },
      id: null,
    };
    return;
  }

  const toolCtx: McpRequestContext = {
    services: {
      ledgerShell: layers.services.ledgerShell,
      ledgerRepo: layers.services.ledgerRepo,
      ledgerData: layers.services.ledgerData,
      ledgerFinance: layers.services.ledgerFinance,
      ledgerJournal: layers.services.ledgerJournal,
      ledgerAccount: layers.services.ledgerAccount,
      plaidItem: layers.services.plaidItem,
      plaidSync: layers.services.plaidSync,
    },
    identity,
    ledgerId: identity.ledgerScope,
    llmService: layers.services.llm,
    apiKeyService: layers.services.apiKey,
    socialService: layers.services.userProfile,
    accountService: layers.services.account,
    assetStorage: layers.services.assetStorage,
    ledgerEntryService: layers.services.ledgerEntry,
    aiCfoUsage: layers.services.aiCfoUsage,
    subscriptionService: layers.services.subscriptions,
    ledgerReceiptWorkflow: layers.workflows.ledgerReceipt,
    legacyEntryWorkflow: layers.workflows.legacyEntry,
    ledgerWorkflow: layers.workflows.ledger,
    ledgerAssetService: layers.services.ledgerAsset,
    ledgerArchiveService: layers.services.ledgerArchive,
    pullRequestWorkflow: layers.workflows.pullRequest,
    commitsService: layers.services.commits,
    publicKeyService: layers.services.ledgerPublicKey,
    collaboratorsWorkflow: layers.workflows.ledgerCollaborators,
  };

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const server = buildMcpServer(toolCtx);

  try {
    await server.connect(transport);
    ctx.respond = false;
    // ctx.request.body requires koa-bodyparser (or equivalent) middleware upstream
    await transport.handleRequest(
      ctx.req,
      ctx.res as ServerResponse,
      ctx.request.body,
    );
  } catch (err) {
    mcpLogger.error("MCP request failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    if (!ctx.res.headersSent) {
      ctx.res.writeHead(500, { "Content-Type": "application/json" });
      ctx.res.end(JSON.stringify({ error: "Internal server error" }));
    }
  } finally {
    await server.close();
  }
}

/** The one spelling of this endpoint's path; everything else derives from it. */
export const MCP_ENDPOINT_PATH = "/api-gateway/mcp";

export function setMcpRoute(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
  buildMcpServer: McpServerFactory,
): void {
  const handler: Router.Middleware = (ctx) =>
    handleMcpRequest(ctx, layers, config, buildMcpServer);
  router.post(MCP_ENDPOINT_PATH, handler);
  router.get(MCP_ENDPOINT_PATH, handler);
  router.delete(MCP_ENDPOINT_PATH, handler);

  // How this mount wants its POSTs charged (w2/014). Registered from the same
  // path the route just mounted, and through the same `requestOpId` the
  // limiter uses to identify it, so the two cannot drift — renaming the route
  // moves the policy with it instead of silently re-charging the handshake.
  setRouteRateLimitPolicy(
    requestOpId(["POST"], MCP_ENDPOINT_PATH, "POST"),
    mcpRateLimitPolicy,
  );
}
