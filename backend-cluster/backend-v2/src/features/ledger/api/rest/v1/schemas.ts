import { z } from "@/shared/zod-openapi-setup";
import { createLedgerId } from "@/shared/str";
import {
  LEDGER_OWNER_PATTERN,
  LEDGER_NAME_PATTERN,
  LEDGER_OWNER_RULE,
  LEDGER_NAME_RULE,
} from "@/shared/ledger-slug";

/**
 * Shared request shapes for the v1 surface.
 *
 * The ledger is addressed as two path segments, `{owner}/{name}`, never as one
 * `{ledgerId}` (ADR 0006 D7). A ledger id is `owner/name`, so putting it in a
 * single segment means a URL-encoded `%2F` that has to survive Cloudflare and
 * Caddy unchanged; the existing `/api-gateway/ledgers/:ledgerId/...` route
 * depends on exactly that, and v1 does not copy it.
 */

export const ledgerPathSchema = z
  .object({
    owner: z.string().regex(LEDGER_OWNER_PATTERN, LEDGER_OWNER_RULE).openapi({
      description: "Ledger owner's username",
      example: "alice",
    }),
    name: z.string().regex(LEDGER_NAME_PATTERN, LEDGER_NAME_RULE).openapi({
      description: "Ledger (repository) name",
      example: "main-ledger",
    }),
  })
  .openapi("LedgerPath", {
    description: "The ledger, addressed as two path segments",
  });

export type LedgerPath = z.infer<typeof ledgerPathSchema>;

/** `owner/name` from the path, in the form the service layer takes. */
export const ledgerIdOf = (params: LedgerPath): string =>
  createLedgerId(params.owner, params.name);
