import type Router from "@koa/router";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { OAUTH_CONFIG } from "@/features/oauth/data/config";
import { assertSafeArchiveName } from "@/features/ledger/utils/safe-archive-name";
import { resolveIdentity, identityHasCapability } from "@/server/api/identity";
import { enforceRateLimit } from "@/server/api/rate-limit";
import { requestOpId } from "@/server/api/rest-op-id";
import { clientAddress } from "@/server/client-address";
import { ForbiddenError, RateLimitedError } from "@/shared/errors";
import { createLedgerId } from "@/shared/str";
import { MCP_ENDPOINT_PATH, refuseUnauthenticated } from "./mcp-route";

/**
 * Streams a ledger archive of any size to a client holding only an MCP OAuth
 * token (w23/026, ADR 0007 amendment).
 *
 * The MCP `archive/{archive}` resource answers in one JSON-RPC message and is
 * capped at `MCP_ARCHIVE_BLOB_MAX_BYTES`; the REST download refuses an MCP
 * audience token. This route is the one non-JSON-RPC path under the MCP
 * resource: it accepts the MCP audience, never a browser session, and goes
 * through the same ledger archive service as every other spelling, so the
 * credential pin, per-ledger read authorization and the shared archive budget
 * apply unchanged.
 */
const MCP_ARCHIVE_PATH = `${MCP_ENDPOINT_PATH}/archive/:owner/:name/:archive`;

export function setMcpArchiveRoute(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): void {
  router.get(MCP_ARCHIVE_PATH, async (ctx) => {
    const identity = await resolveIdentity(ctx, layers.database, config, {
      oauthResource: OAUTH_CONFIG.resourceBindings.mcp,
    });
    // As on the JSON-RPC endpoint, a browser session is not an MCP credential.
    if (!identity || identity.method === "session") {
      refuseUnauthenticated(ctx, config);
      return;
    }
    if (!identityHasCapability(identity, "read")) {
      throw new ForbiddenError(
        "This credential cannot download ledger archives: it needs the ledger.read scope",
      );
    }

    try {
      await enforceRateLimit({
        opId: requestOpId(["GET"], MCP_ARCHIVE_PATH, "GET"),
        identity,
        ip: clientAddress(ctx),
      });
    } catch (error) {
      if (error instanceof RateLimitedError) {
        const retryAfter = (
          error.metadata as { retryAfter?: number } | undefined
        )?.retryAfter;
        if (retryAfter !== undefined)
          ctx.set("Retry-After", String(retryAfter));
      }
      throw error;
    }

    const { owner, name, archive } = ctx.params;
    assertSafeArchiveName(archive);
    const download = await layers.services.ledgerArchive.download({
      ledgerId: createLedgerId(owner, name),
      archive,
      identity,
    });
    ctx.set("content-type", download.contentType);
    if (download.contentDisposition)
      ctx.set("content-disposition", download.contentDisposition);
    ctx.set("Cache-Control", "private, no-store");
    ctx.body = download.body;
  });
}
