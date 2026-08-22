import Router from "@koa/router";
import { authMiddleware } from "@/server/auth";
import { successResponse } from "@/server/envelope";
import { intQuery, strQuery, boolQuery } from "./query-params";
import { ledgerIdOf, servicesForRequest } from "./service-context";
import type {
  CustomSubtype,
  DirectiveType,
  DocumentSubtype,
  TransactionSubtype,
} from "@/foundation/ledger-api-types";

function listQuery(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

export function setJournalHandler(router: Router): void {
  const base = "/journal/:owner/:repo_name";

  // operationId: getJournal — wire {items, total, is_empty}
  router.get(base, authMiddleware, async (ctx) => {
    const { journal } = servicesForRequest(ctx);
    const result = await journal.getJournal({
      ledgerId: ledgerIdOf(ctx),
      userId: undefined,
      query: {
        account: strQuery(ctx.query.account),
        filter: strQuery(ctx.query.filter),
        time: strQuery(ctx.query.time),
        offset: intQuery(ctx.query.offset),
        limit: intQuery(ctx.query.limit),
        directiveTypes: listQuery(ctx.query.directive_types) as
          | DirectiveType[]
          | undefined,
        transactionSubtypes: listQuery(ctx.query.transaction_subtypes) as
          | TransactionSubtype[]
          | undefined,
        documentSubtypes: listQuery(ctx.query.document_subtypes) as
          | DocumentSubtype[]
          | undefined,
        customSubtypes: listQuery(ctx.query.custom_subtypes) as
          | CustomSubtype[]
          | undefined,
      },
    });
    ctx.body = successResponse({
      items: result.data,
      total: result.total,
      is_empty: result.is_empty,
    });
  });

  // operationId: plaintextJournal — wire {content}
  router.get(`${base}/plaintext`, authMiddleware, async (ctx) => {
    const { journal } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await journal.plaintextJournal({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        query: {
          account: strQuery(ctx.query.account),
          filter: strQuery(ctx.query.filter),
          time: strQuery(ctx.query.time),
        },
      }),
    );
  });

  // operationId: getAccountJournal
  router.get(`${base}/account-journal`, authMiddleware, async (ctx) => {
    const { journal } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await journal.getAccountJournal({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        query: {
          account: strQuery(ctx.query.account) ?? "",
          filter: strQuery(ctx.query.filter),
          time: strQuery(ctx.query.time),
          offset: intQuery(ctx.query.offset),
          limit: intQuery(ctx.query.limit),
          with_children: boolQuery(ctx.query.with_children),
          conversion: strQuery(ctx.query.conversion),
        },
      }),
    );
  });

  // operationId: getContext — wire {entry, balances_before, balances_after, sha256sum, slice}
  router.get(`${base}/context/:entry_hash`, authMiddleware, async (ctx) => {
    const { journal } = servicesForRequest(ctx);
    ctx.body = successResponse(
      await journal.getContext({
        ledgerId: ledgerIdOf(ctx),
        userId: undefined,
        entryHash: ctx.params.entry_hash,
      }),
    );
  });

  // operationId: updateSourceSlice — wire {message, entry_hash, new_sha256sum}
  router.put(`${base}/source-slice`, authMiddleware, async (ctx) => {
    const { journal } = servicesForRequest(ctx);
    const body = (ctx.request.body ?? {}) as {
      entry_hash: string;
      sha256sum: string;
      new_content: string;
    };
    const result = await journal.updateSourceSlice({
      ledgerId: ledgerIdOf(ctx),
      userId: "",
      entryHash: body.entry_hash,
      sha256sum: body.sha256sum,
      newContent: body.new_content,
    });
    ctx.body = successResponse({
      // Python fava-slim template: f"Updated entry {entry_hash}"
      message: `Updated entry ${body.entry_hash}`,
      entry_hash: result.entryHash,
      new_sha256sum: result.newSha256sum,
    });
  });

  // operationId: deleteSourceSlice — wire {message, entry_hash}
  router.delete(`${base}/source-slice`, authMiddleware, async (ctx) => {
    const { journal } = servicesForRequest(ctx);
    const body = (ctx.request.body ?? {}) as {
      entry_hash: string;
      sha256sum: string;
    };
    const result = await journal.deleteSourceSlice({
      ledgerId: ledgerIdOf(ctx),
      userId: "",
      entryHash: body.entry_hash,
      sha256sum: body.sha256sum,
    });
    ctx.body = successResponse({
      // Python fava-slim template: f"Deleted entry {entry_hash}"
      message: `Deleted entry ${body.entry_hash}`,
      entry_hash: result.entryHash,
    });
  });

  // operationId: deleteMultiSourceSlices — wire {message, deleted_hashes}
  router.delete(`${base}/source-slices`, authMiddleware, async (ctx) => {
    const { journal } = servicesForRequest(ctx);
    const body = (ctx.request.body ?? {}) as {
      entries: { entry_hash: string; sha256sum: string }[];
    };
    const result = await journal.deleteMultiSourceSlices({
      ledgerId: ledgerIdOf(ctx),
      userId: "",
      entries: (body.entries ?? []).map((e) => ({
        entryHash: e.entry_hash,
        sha256sum: e.sha256sum,
      })),
    });
    ctx.body = successResponse({
      // Python: f"Deleted {n} entries: {', '.join(deleted_hashes)}"
      message: `Deleted ${result.deletedHashes.length} entries: ${result.deletedHashes.join(", ")}`,
      deleted_hashes: result.deletedHashes,
    });
  });
}
