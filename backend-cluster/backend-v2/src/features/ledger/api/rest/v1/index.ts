import { legacyEntryRoute } from "./legacy-entry-handler";
import { SOURCE_SLICE_ROUTES } from "./source-slice-handler";
import { renameFileRoute } from "./rename-handler";
import { receiptInsertRoute } from "./receipt-insert-handler";
import { receiptParseRoute } from "@/features/llm/api/receipt-parse-route";
import { fileParseRoute } from "@/features/llm/api/file-parse-route";
import { suggestCategoriesRoute } from "@/features/llm/api/suggest-categories-route";
import { TEMP_ASSET_ROUTES } from "@/features/s3/api/temp-asset-routes";
import { STAR_ROUTES } from "./star-handler";
import { ASSET_URL_ROUTES } from "./asset-url-handler";
import { PULL_REQUEST_ROUTES } from "@/features/gitea/pull-request/api/pull-request-routes";
import { LEDGER_LIFECYCLE_ROUTES } from "./lifecycle-handler";
import { PUBLIC_KEY_ROUTES } from "./public-keys-handler";
import { COLLABORATOR_ROUTES } from "./collaborators-handler";
import { COMMIT_ROUTES } from "@/features/gitea/commits/api/commit-reads";
import { LEGACY_JOURNAL_ROUTES } from "./legacy-journal-handler";
import { LEGACY_METADATA_ROUTES } from "./legacy-metadata-handler";
import Router from "@koa/router";
import type { AppConfig } from "@/config/config";
import type { AppLayers } from "@/foundation/composition";

import { LEDGER_ROUTES } from "./ledgers-handler";
import { QUERY_ROUTES } from "./query-handler";
import { REPORT_ROUTES } from "./reports-handler";
import { FILE_ROUTES } from "./files-handler";
import { ENTRY_ROUTES } from "./entries-handler";
import { VOCABULARY_ROUTES } from "./vocabulary-handler";
import { ANALYSIS_ROUTES } from "./analysis-handler";
import { BANK_ROUTES } from "./banks-handler";
import { ARCHIVE_DOWNLOAD_ROUTES } from "./archive-handler";
import { registerV1Routes } from "@/server/rest/v1-route";

/**
 * The v1 REST surface (ADR 0006 D7) — deliberately small.
 *
 * Not every one of the 130-odd GraphQL ops needs a REST twin. v1's target is
 * narrower and more testable: *someone who has never read our GraphQL schema
 * can query a ledger with curl in ten minutes.* Everything that clears that
 * bar is here; everything else stays GraphQL-only with a written reason in the
 * op-class table, where the parity test reads it.
 *
 * Every route uses the shared v1 identity and scope gate.
 */
const V1_SCOPED_ROUTES: Parameters<typeof registerV1Routes>[2] = [
  ...LEDGER_ROUTES,
  ...ASSET_URL_ROUTES,
  ...TEMP_ASSET_ROUTES,
  fileParseRoute,
  receiptParseRoute,
  suggestCategoriesRoute,
  receiptInsertRoute,
  ...PULL_REQUEST_ROUTES,
  ...STAR_ROUTES,
  ...LEDGER_LIFECYCLE_ROUTES,
  ...COMMIT_ROUTES,
  ...COLLABORATOR_ROUTES,
  ...PUBLIC_KEY_ROUTES,
  ...LEGACY_METADATA_ROUTES,
  ...LEGACY_JOURNAL_ROUTES,
  ...QUERY_ROUTES,
  ...REPORT_ROUTES,
  ...FILE_ROUTES,
  renameFileRoute,
  ...ENTRY_ROUTES,
  legacyEntryRoute,
  ...SOURCE_SLICE_ROUTES,
  ...VOCABULARY_ROUTES,
  ...ANALYSIS_ROUTES,
  ...BANK_ROUTES,
  ...ARCHIVE_DOWNLOAD_ROUTES,
];

/** Every v1 route — what the completeness test enumerates. */
export const V1_ROUTES = V1_SCOPED_ROUTES;

/** The scoped fragment: everything a credential-bearing caller reaches. */
export function setLedgerV1Routes(
  router: Router,
  layers: AppLayers,
  config: AppConfig,
): void {
  registerV1Routes(router, { layers, config }, V1_SCOPED_ROUTES);
}
