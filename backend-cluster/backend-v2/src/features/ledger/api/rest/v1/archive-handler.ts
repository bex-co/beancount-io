import { z } from "@/shared/zod-openapi-setup";
import { ForbiddenError } from "@/shared/errors";
import { streamLedgerArchive } from "../archive-proxy";
import { json, ledgerIdOf, ledgerPathSchema } from "./schemas";
import { v1Route } from "./route";
import {
  mintArchiveTicket,
  redeemArchiveTicket,
  TICKET_LIFETIME_MS,
} from "./archive-ticket";

const archiveParamsSchema = ledgerPathSchema.extend({
  archive: z.string().min(1).openapi({
    description:
      "Archive to download. Git archives are `gitea-<branch>.zip`; `tar.gz` and `zip` are also accepted.",
    example: "gitea-main.zip",
  }),
});

const downloadQuerySchema = z.object({
  ticket: z.string().min(1).openapi({
    description:
      "Single-use ticket from POST /v1/ledgers/{owner}/{name}/archive-tickets",
  }),
});

const ticketSchema = z
  .object({
    url: z.string().openapi({
      description:
        "The download URL, ticket included. Valid once, for 60 seconds.",
      example:
        "/v1/ledgers/alice/main-ledger/archive/gitea-main.zip?ticket=v1.eyJ1c2VySWQi...",
    }),
    expiresAt: z.string().openapi({
      description: "When the ticket stops being redeemable (ISO 8601)",
      example: "2026-08-23T12:00:60.000Z",
    }),
  })
  .openapi("ArchiveTicket", {
    description: "A single-use archive download ticket",
  });

/**
 * Archive download, in two steps.
 *
 * The authenticated call mints a ticket; the download redeems it. Splitting it
 * is what lets the download URL be a plain link — pasteable into a browser,
 * an `<a href>`, a `curl -O` — without that link carrying the caller's session
 * credential the way `?token=<JWT>` did (ADR 0006 security repair 1).
 *
 * Minting is `read`-classed: a ticket grants exactly what reading the ledger
 * already grants, so it needs no more authority than the read it stands in for.
 */
export const ARCHIVE_TICKET_ROUTES = [
  v1Route({
    method: "post",
    path: "/v1/ledgers/{owner}/{name}/archive-tickets",
    summary: "Mint an archive download ticket",
    description: `Returns a URL that downloads the archive once, within ${TICKET_LIFETIME_MS / 1000} seconds. The ticket is bound to the caller, the ledger, and the archive name, and is refused on a second use.`,
    // The archive is named in the body, not the path: minting is an operation
    // on the ledger, and the ticket it returns is what names the archive.
    params: ledgerPathSchema,
    body: z
      .object({
        archive: archiveParamsSchema.shape.archive,
      })
      .openapi("ArchiveTicketRequest", {
        description: "Which archive the ticket should authorize",
      }),
    responses: {
      200: json("A single-use download URL", ticketSchema),
    },
    handler: async ({ layers, config }, { identity, params, body }) => {
      const ledgerId = ledgerIdOf(params);
      // Authorization is the read the ticket stands in for: if the caller
      // cannot list the ledger's files, they get no ticket for its bytes.
      await layers.services.ledgerRepo.listDirContent({ ledgerId, identity });

      const { ticket, expiresAt } = await mintArchiveTicket(
        { userId: identity.userId, ledgerId, archive: body.archive },
        config.jwt.secret,
        layers.clients.cacheHelper,
      );
      return {
        url: `/v1/ledgers/${params.owner}/${params.name}/archive/${encodeURIComponent(body.archive)}?ticket=${encodeURIComponent(ticket)}`,
        expiresAt,
      };
    },
  }),
] as const;

/**
 * The download itself, outside the identity gate: the ticket is the credential.
 *
 * A browser following a download link cannot attach an `Authorization` header,
 * which is exactly why the endpoint this replaces accepted a JWT in the query
 * string. The ticket is the same shape of thing — a credential in a URL — and
 * a different kind of secret: single-use, sixty seconds, one archive of one
 * ledger for one user. What leaks into a log is already spent.
 */
export const ARCHIVE_DOWNLOAD_ROUTES = [
  v1Route({
    method: "get",
    path: "/v1/ledgers/{owner}/{name}/archive/{archive}",
    summary: "Download a ledger archive",
    description:
      "Streams the archive. Requires a ticket from the archive-tickets endpoint; no bearer token is read here, and a ticket works exactly once.",
    auth: "ticket",
    params: archiveParamsSchema,
    query: downloadQuerySchema,
    responses: {
      200: {
        description: "The archive bytes",
        content: {
          "application/zip": { schema: z.string() },
          "application/gzip": { schema: z.string() },
        },
      },
    },
    handler: async ({ layers, config }, { params, query, ctx }) => {
      const ledgerId = ledgerIdOf(params);
      if (!config.jwt.secret) {
        // Without a signing secret every ticket would verify against an empty
        // key. Refuse rather than serve.
        throw new ForbiddenError("Archive tickets are not configured");
      }
      const { userId } = await redeemArchiveTicket(
        query.ticket,
        { ledgerId, archive: params.archive },
        config.jwt.secret,
        layers.clients.cacheHelper,
      );
      await streamLedgerArchive(ctx, layers, config, {
        ledgerId,
        archive: params.archive,
        userId,
      });
      return undefined;
    },
  }),
] as const;
