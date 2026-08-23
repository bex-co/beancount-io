import type { ServerResponse } from "node:http";
import Router from "@koa/router";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { logger } from "@/shared/logger";
import { type AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import type { ToolContext } from "../tools/types";
import { type Identity, resolveIdentity } from "@/server/api/identity";
import { ForbiddenError } from "@/shared/errors";

const mcpLogger = logger.child({ module: "mcp-handler" });

/**
 * Builds the one MCP registry for a request's caller. Injected rather than
 * imported: the registry is assembled by the composition root, from this
 * feature's `MCP_TOOLS` fragment and with the scope gate wrapped round each
 * handler, and a feature that reached back into the root to get it would put a
 * cycle where the whole point is that there is none (ADR 0006 D1/参考实现 2).
 */
export type McpServerFactory = (toolCtx: ToolContext) => McpServer;

/**
 * The one ledger this MCP session may touch. MCP requires a ledger-pinned
 * credential — an unpinned token is a legitimate thing to hold (it reaches
 * GraphQL and REST fine) but MCP has no per-call ledger argument to fall back
 * on, so it is refused here rather than guessed at.
 *
 * This no longer checks the user exists or can reach the ledger: every tool
 * call authorizes itself, per call, through its service's own
 * `authorizeLedger` seam (ADR 0006 D4/D5) — that is what makes a mid-session
 * revocation take effect on the very next tool call rather than at the next
 * session, which a once-at-connect check here could not do.
 */
function resolveMcpLedgerId(identity: Identity): string {
  if (!identity.ledgerScope) {
    throw new ForbiddenError(
      "This credential is not bound to a ledger; MCP requires a ledger-scoped grant",
    );
  }
  return identity.ledgerScope;
}

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
  const identity = await resolveIdentity(ctx, layers.database, config);
  if (!identity || identity.method === "session") {
    refuseUnauthenticated(ctx, config);
    return;
  }

  // Throws ForbiddenError for an unpinned credential — handled by restErrorMiddleware
  const ledgerId = resolveMcpLedgerId(identity);

  const toolCtx: ToolContext = {
    services: {
      ledgerShell: layers.services.ledgerShell,
      ledgerRepo: layers.services.ledgerRepo,
      apiKey: layers.services.apiKey,
    },
    identity,
    ledgerId,
    llmService: layers.services.llm,
    ledgerReceiptWorkflow: layers.workflows.ledgerReceipt,
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

export function setMcpRoute(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
  buildMcpServer: McpServerFactory,
): void {
  const handler: Router.Middleware = (ctx) =>
    handleMcpRequest(ctx, layers, config, buildMcpServer);
  router.post("/api-gateway/mcp", handler);
  router.get("/api-gateway/mcp", handler);
  router.delete("/api-gateway/mcp", handler);
}
