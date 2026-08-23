import Router from "@koa/router";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";

import { LEDGER_ROUTES } from "./ledgers-handler";
import { QUERY_ROUTES } from "./query-handler";
import { REPORT_ROUTES } from "./reports-handler";
import { FILE_ROUTES } from "./files-handler";
import { ENTRY_ROUTES } from "./entries-handler";
import {
  ARCHIVE_DOWNLOAD_ROUTES,
  ARCHIVE_TICKET_ROUTES,
} from "./archive-handler";
import { registerV1Routes, type V1Route } from "@/server/rest/v1-route";

/**
 * The v1 REST surface (ADR 0006 D7) — deliberately small.
 *
 * Not every one of the 130-odd GraphQL ops needs a REST twin. v1's target is
 * narrower and more testable: *someone who has never read our GraphQL schema
 * can query a ledger with curl in ten minutes.* Everything that clears that
 * bar is here; everything else stays GraphQL-only with a written reason in the
 * op-class table, where the parity test reads it.
 *
 * Split into two fragments because they sit on opposite sides of the identity
 * gate — see `ARCHIVE_DOWNLOAD_ROUTES`.
 */
export const V1_SCOPED_ROUTES: readonly V1Route<never, never, never>[] = [
  ...LEDGER_ROUTES,
  ...QUERY_ROUTES,
  ...REPORT_ROUTES,
  ...FILE_ROUTES,
  ...ENTRY_ROUTES,
  ...ARCHIVE_TICKET_ROUTES,
];

export const V1_TICKET_ROUTES: readonly V1Route<never, never, never>[] = [
  ...ARCHIVE_DOWNLOAD_ROUTES,
];

/** Every v1 route, both fragments — what the completeness test enumerates. */
export const V1_ROUTES: readonly V1Route<never, never, never>[] = [
  ...V1_SCOPED_ROUTES,
  ...V1_TICKET_ROUTES,
];

/** The scoped fragment: everything a credential-bearing caller reaches. */
export function setLedgerV1Routes(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): void {
  registerV1Routes(router, { layers, config }, V1_SCOPED_ROUTES);
}

/** The ticket-authenticated fragment: the archive download, and only that. */
export function setLedgerV1TicketRoutes(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): void {
  registerV1Routes(router, { layers, config }, V1_TICKET_ROUTES);
}
