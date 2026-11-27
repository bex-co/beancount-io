import type Router from "@koa/router";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";
import { OAUTH_CONFIG } from "@/features/oauth/data/config";
import { assertSafeArchiveName } from "@/features/ledger/utils/safe-archive-name";
import { resolveIdentity, identityHasCapability } from "@/server/api/identity";
import { validateRequest } from "@/server/rest/validation-middleware";
import { ForbiddenError } from "@/shared/errors";
import { createLedgerId } from "@/shared/str";
import { z } from "@/shared/zod-openapi-setup";
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
 * credential pin and per-ledger read authorization apply unchanged.
 *
 * The shared archive budget is spent before this handler runs, by the REST
 * limiter, which resolves this mount's bearer against the MCP audience (its
 * fragment says so) and charges the credential. Charging here as well spent
 * two tokens per download, so the documented 30 a minute stopped at 15
 * (w31/112).
 */
const MCP_ARCHIVE_PATH = `${MCP_ENDPOINT_PATH}/archive/:owner/:name/:archive`;
const validateArchiveRequest = validateRequest({
  query: z.strictObject({}).optional(),
});

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

    // Mirror v1Route's request boundary (percent-encoding, NUL/surrogate/limit
    // checks, and empty strict query) after auth and rate-limit gates (w31/073).
    await validateArchiveRequest(ctx, async () => undefined);

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
