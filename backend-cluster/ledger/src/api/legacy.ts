import Router from "@koa/router";
import { authMiddleware, giteaClientForRequest } from "@/server/auth";
import { successResponse } from "@/server/envelope";
import { boolQuery, intQuery, strQuery } from "./query-params";
import { getCacheHelper } from "@/foundation/clients/build-cache";
import {
  loadCachedFileMapForRepo,
  type GiteaCommitClient,
} from "@/foundation/clients/load-cached-ledger-file-map";
import { parseLedgerFiles } from "@/foundation/rustledger";
import { buildEntryIdMap } from "@/foundation/rustledger/entry-hash";
import type { EntrySourceLocation } from "@/foundation/rustledger";
import { runLegacyJournal } from "@/features/ledger/service/ledger-legacy-journal";

function floatQuery(value: string | string[] | undefined): number | undefined {
  const first = strQuery(value);
  if (first === undefined) return undefined;
  const parsed = parseFloat(first);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function setLegacyHandler(router: Router): void {
  // operationId: getLegacyJournal — GET /legacy/journal/{o}/{r}
  router.get(
    "/legacy/journal/:owner/:repo_name",
    authMiddleware,
    async (ctx) => {
      const client = giteaClientForRequest(ctx);
      const { files, entryPoint, repoPaths } = await loadCachedFileMapForRepo(
        client as unknown as GiteaCommitClient,
        getCacheHelper(),
        ctx.params.owner,
        ctx.params.repo_name,
      );
      const snapshot = await parseLedgerFiles(files, entryPoint, {
        repoPaths,
        includeSourceDetails: true,
      });

      const entryIds = buildEntryIdMap(snapshot.directives);
      const sourceLocations = new Map<string, EntrySourceLocation>(
        Object.entries(snapshot.sourceDetails ?? {}).map(([id, detail]) => [
          id,
          { filename: detail.filename, lineno: detail.lineno },
        ]),
      );

      const entryTypes = strQuery(ctx.query.entry_types);
      const result = runLegacyJournal(
        snapshot.directives,
        {
          first: intQuery(ctx.query.first),
          after: strQuery(ctx.query.after),
          last: intQuery(ctx.query.last),
          before: strQuery(ctx.query.before),
          searchQuery: strQuery(ctx.query.search_query),
          accountFilter: strQuery(ctx.query.account_filter),
          amountMin: floatQuery(ctx.query.amount_min),
          amountMax: floatQuery(ctx.query.amount_max),
          entryTypes: entryTypes ? entryTypes.split(",") : undefined,
          sortBy: strQuery(ctx.query.sort_by) ?? "date",
          sortOrder: strQuery(ctx.query.sort_order) ?? "desc",
          detailed: boolQuery(ctx.query.detailed) ?? false,
        },
        entryIds,
        sourceLocations,
      );
      ctx.body = successResponse(result);
    },
  );
}
