import { z } from "@/shared/zod-openapi-setup";
import { streamLedgerArchive } from "../archive-proxy";
import { ledgerIdOf, ledgerPathSchema } from "./schemas";
import { v1Route } from "@/server/rest/v1-route";
import { SAFE_ARCHIVE_NAME_PATTERN } from "../safe-archive-name";

const archiveParamsSchema = ledgerPathSchema.extend({
  archive: z.string().regex(SAFE_ARCHIVE_NAME_PATTERN).openapi({
    description:
      "Archive to download. Git archives are `gitea-<branch>.zip`; `tar.gz` and `zip` are also accepted.",
    example: "gitea-main.zip",
  }),
});

const archiveBodySchema = z.string().openapi({ format: "binary" });

/**
 * Authenticated archive download using the same identity seam as every other
 * v1 route. Browser navigation presents the session cookie; CLI and third-party
 * clients present an OAuth bearer token or personal API key.
 */
export const ARCHIVE_DOWNLOAD_ROUTES = [
  v1Route({
    method: "get",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/archive/{archive}",
    summary: "Download a ledger archive",
    description:
      "Streams the archive for an authenticated caller with read access to the ledger. Send a session cookie, OAuth bearer token, or personal API key.",
    params: archiveParamsSchema,
    responses: {
      200: {
        description: "The archive bytes",
        content: {
          "application/zip": { schema: archiveBodySchema },
          "application/gzip": { schema: archiveBodySchema },
        },
      },
    },
    handler: async ({ layers, config }, { identity, params, ctx }) => {
      const ledgerId = ledgerIdOf(params);
      await layers.services.ledgerRepo.listDirContent({ ledgerId, identity });
      await streamLedgerArchive(ctx, layers, config, {
        ledgerId,
        archive: params.archive,
        userId: identity.userId,
      });
      return undefined;
    },
  }),
] as const;
