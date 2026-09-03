import Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import { registerRoute } from "@/server/rest/openapi-registry";
import { type AppLayers } from "@/foundation/composition";
import { AppConfig } from "@/config/config";
import { resolveIdentity } from "@/server/api/identity";
import { streamLedgerArchive } from "./archive-proxy";
import { parseLedgerId } from "@/shared/str";
import {
  assertSafeArchiveName,
  SAFE_ARCHIVE_NAME_PATTERN,
} from "./safe-archive-name";

/**
 * The pre-v1 archive download. Superseded, kept for existing clients.
 *
 * What is still wrong with it, fixed by
 * `GET /api-gateway/v1/ledgers/{owner}/{name}/archive/{archive}`:
 * `:ledgerId` is one path segment holding `owner/name`, which only works while
 * an encoded `%2F` survives Cloudflare and Caddy unchanged. v1 splits it into
 * two segments.
 *
 * The other reason for v1 — this route's former acceptance of `?token=<JWT>`,
 * the caller's long-lived session credential in a URL — is no longer a
 * property of either route. Query-string credentials are ignored;
 * `Authorization: Bearer` still works here, anonymous reads of public ledgers
 * remain compatible, and the v1 route uses the standard identity gate.
 *
 * Removal of the route itself is a separate, dated decision once clients have
 * moved; until then it is marked `deprecated` in the spec so nobody adopts it
 * by accident.
 */
const downloadArchiveParamsSchema = z
  .object({
    ledgerId: z.string().openapi({
      description:
        "Ledger identifier in format 'owner/repo' (e.g., 'user123/main-ledger')",
      example: "user123/main-ledger",
    }),
    archive: z.string().regex(SAFE_ARCHIVE_NAME_PATTERN).openapi({
      description:
        "Archive format to download. Common formats: 'tar.gz', 'zip'. For Git archives, use 'gitea-<branch>.zip'",
      example: "gitea-main.zip",
    }),
  })
  .openapi("DownloadArchiveParams", {
    description: "Path parameters for downloading ledger archive",
  });

export function registerDownloadArchiveRoute(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): void {
  router.get("/api-gateway/ledgers/:ledgerId/archive/:archive", async (ctx) => {
    const { ledgerId, archive } = ctx.params;
    // Parsed here purely to reject a malformed id before anything downstream
    // assumes it splits.
    parseLedgerId(ledgerId);
    assertSafeArchiveName(archive);

    const identity = await resolveIdentity(ctx, layers.database, config);
    await streamLedgerArchive(ctx, layers, config, {
      ledgerId,
      archive,
      identity,
    });
  });

  registerRoute({
    method: "get",
    // The mounted path, not a prettier one: this route previously declared
    // `/ledgers/{ledgerId}/...` while mounting `/api-gateway/ledgers/...`, so
    // the published spec named a URL that 404s. `openapi-completeness.test.ts`
    // now fails on that class of drift.
    path: "/api-gateway/ledgers/{ledgerId}/archive/{archive}",
    deprecated: true,
    summary: "Download ledger archive file (deprecated)",
    description: `Downloads a ledger archive in the specified format (e.g., tar.gz, zip).

**Deprecated.** Use
\`GET /api-gateway/v1/ledgers/{owner}/{name}/archive/{archive}\` with a session cookie,
OAuth bearer token, or personal API key instead. This route addresses the ledger as a single
\`owner%2Fname\` path segment. A credential in the query string is not read by either route.

Common archive formats:
- 'gitea-main.zip' - Git archive from Gitea repository (main branch)
- 'tar.gz' - Tarball archive
- 'zip' - ZIP archive`,
    tags: ["Ledger"],
    request: {
      params: downloadArchiveParamsSchema,
    },
    responses: {
      200: {
        description: "Archive file download stream",
        content: {
          "application/zip": {
            schema: { type: "string", format: "binary" },
          },
          "application/gzip": {
            schema: { type: "string", format: "binary" },
          },
          "application/x-tar": {
            schema: { type: "string", format: "binary" },
          },
        },
      },
      401: { description: "Unauthorized - private ledger without credentials" },
      404: { description: "Archive or ledger not found" },
      500: { description: "Failed to download archive from upstream service" },
    },
  });
}
