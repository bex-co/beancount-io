import Router from "@koa/router";
import { z } from "@/shared/zod-openapi-setup";
import { registerRoute } from "@/server/rest/openapi-registry";
import { type AppLayers } from "@/foundation/composition";
import { AppConfig } from "@/config/config";
import { getTokenFromCtx } from "@/features/auth/utils/auth";
import { resolveLedgerCaller } from "../../utils/ledger-caller-resolver";
import { streamLedgerArchive } from "./archive-proxy";
import { parseLedgerId } from "@/shared/str";

/**
 * The pre-v1 archive download. Superseded, kept for existing clients.
 *
 * Two things are wrong with it, both fixed by
 * `GET /v1/ledgers/{owner}/{name}/archive/{archive}`:
 *
 * 1. It accepts `?token=<JWT>` — the caller's long-lived session credential in
 *    a URL, and therefore in access logs, Referer headers, browser history, and
 *    CDN logs. v1 takes a single-use 60-second ticket instead.
 * 2. `:ledgerId` is one path segment holding `owner/name`, which only works
 *    while an encoded `%2F` survives Cloudflare and Caddy unchanged. v1 splits
 *    it into two segments.
 *
 * Removal is a separate, dated decision once clients have moved; until then it
 * is marked `deprecated` in the spec so nobody adopts it by accident.
 */
export const downloadArchiveParamsSchema = z
  .object({
    ledgerId: z.string().openapi({
      description:
        "Ledger identifier in format 'owner/repo' (e.g., 'user123/main-ledger')",
      example: "user123/main-ledger",
    }),
    archive: z.string().openapi({
      description:
        "Archive format to download. Common formats: 'tar.gz', 'zip'. For Git archives, use 'gitea-<branch>.zip'",
      example: "gitea-main.zip",
    }),
  })
  .openapi("DownloadArchiveParams", {
    description: "Path parameters for downloading ledger archive",
  });

export const downloadArchiveQuerySchema = z
  .object({
    token: z.string().optional().openapi({
      description:
        "DEPRECATED. JWT in the query string; prefer `Authorization: Bearer`, or move to the v1 archive endpoint's single-use ticket.",
    }),
  })
  .openapi("DownloadArchiveQuery", {
    description: "Query parameters for archive download authentication",
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

    const token =
      (ctx.query.token as string | undefined) || getTokenFromCtx(ctx);
    const userId = await resolveLedgerCaller(ledgerId, token, {
      favaClientFactory: layers.clients.favaClientFactory,
      models: layers.database.models,
      db: layers.database.db,
    });

    await streamLedgerArchive(ctx, layers, config, {
      ledgerId,
      archive,
      userId,
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

**Deprecated.** Use \`POST /v1/ledgers/{owner}/{name}/archive-tickets\` followed by
\`GET /v1/ledgers/{owner}/{name}/archive/{archive}?ticket=...\` instead. This route
accepts a JWT in the query string, which puts a long-lived credential into logs and
browser history, and addresses the ledger as a single \`owner%2Fname\` path segment.

Common archive formats:
- 'gitea-main.zip' - Git archive from Gitea repository (main branch)
- 'tar.gz' - Tarball archive
- 'zip' - ZIP archive`,
    tags: ["Ledger"],
    request: {
      params: downloadArchiveParamsSchema,
      query: downloadArchiveQuerySchema,
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
      401: { description: "Unauthorized - invalid or missing token" },
      404: { description: "Archive or ledger not found" },
      500: { description: "Failed to download archive from upstream service" },
    },
  });
}
