import Router from "@koa/router";
import fetch from "node-fetch";
import { z } from "@/shared/zod-openapi-setup";
import { parseLedgerId } from "@/shared/str";
import { registerRoute } from "@/server/rest/openapi-registry";
import { type AppLayers } from "@/foundation/composition";
import { AppConfig } from "@/config/config";
import { getTokenFromCtx } from "@/features/auth/utils/auth";
import { resolveLedgerCaller } from "../../utils/ledger-caller-resolver";

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
    token: z.string().openapi({
      description: "JWT authentication token for verifying user access",
      example:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEifQ.abc123",
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
    const { ledgerOwner, ledgerName } = parseLedgerId(ledgerId);

    // Auth check outside the proxy try/catch so HTTP errors aren't re-wrapped
    const token =
      (ctx.query.token as string | undefined) || getTokenFromCtx(ctx);
    const userId = await resolveLedgerCaller(ledgerId, token, {
      favaClientFactory: layers.clients.favaClientFactory,
      models: layers.database.models,
      db: layers.database.db,
    });

    try {
      // For authenticated users use their own credentials; for public ledgers
      // fall back to the ledger owner's credentials.
      const user = userId
        ? await layers.database.models.user.getById(layers.database.db, userId)
        : await layers.database.models.user.getUserByUsername(
            layers.database.db,
            ledgerOwner,
          );

      if (!user) {
        ctx.throw(401, "User not found");
        return;
      }

      const baseUrl = config.favaApi.baseUrl.replace(/\/$/, "");
      const proxyUrl = `${baseUrl}/ledgers/${ledgerOwner}/${ledgerName}/archive/${archive}`;

      const basicAuth = Buffer.from(
        `${user.ledger_username}:${user.ledger_password}`,
      ).toString("base64");

      const response = await fetch(proxyUrl, {
        method: "GET",
        headers: {
          Authorization: `Basic ${basicAuth}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          ctx.throw(404, "Archive not found");
        } else {
          ctx.throw(
            response.status,
            `Failed to download archive: ${response.statusText}`,
          );
        }
        return;
      }

      const contentType = response.headers.get("content-type");
      if (contentType) {
        ctx.set("Content-Type", contentType);
      }

      const contentDisposition = response.headers.get("content-disposition");
      if (contentDisposition) {
        ctx.set("Content-Disposition", contentDisposition);
      }

      ctx.body = response.body;
    } catch (error) {
      const err = error as Error & { status?: number };
      if (err.status === 404) {
        ctx.throw(404, "Archive not found");
      } else {
        ctx.throw(500, `Failed to download archive: ${err.message}`);
      }
    }
  });

  registerRoute({
    method: "get",
    path: "/ledgers/{ledgerId}/archive/{archive}",
    summary: "Download ledger archive file",
    description: `Downloads a ledger archive in the specified format (e.g., tar.gz, zip).

This endpoint acts as a proxy to the Python ledger service, forwarding the request with the user's credentials.

The user must be authenticated and have access to the specified ledger.

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
