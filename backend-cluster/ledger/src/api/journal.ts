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

  // operationId: plaintextJournal — wire {content, total, truncated}
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
          limit: intQuery(ctx.query.limit),
          offset: intQuery(ctx.query.offset),
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
          filter_account: strQuery(ctx.query.filter_account),
          filter: strQuery(ctx.query.filter),
          time: strQuery(ctx.query.time),
          offset: intQuery(ctx.query.offset),
          limit: intQuery(ctx.query.limit),
          with_children: boolQuery(ctx.query.with_children),
          conversion: strQuery(ctx.query.conversion),
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

  // operationId: updateSourceSlice — wire {message, entry_hash, new_entry_hash, new_sha256sum, files, errors_before, errors_after, new_errors};
  // entry_hash is the entry's NEW content-derived identity after the edit;
  // new_entry_hash repeats it explicitly for clients keying off a named field.
  router.put(`${base}/source-slice`, authMiddleware, async (ctx) => {
    const { journal } = servicesForRequest(ctx);
    const body = (ctx.request.body ?? {}) as {
      entry_hash: string;
      sha256sum: string;
      new_content: string;
      allowInvalid?: boolean | null;
      dryRun?: boolean | null;
    };
    const dryRun = body.dryRun === true;
    const result = await journal.updateSourceSlice({
      ledgerId: ledgerIdOf(ctx),
      userId: "",
      entryHash: body.entry_hash,
      sha256sum: body.sha256sum,
      newContent: body.new_content,
      allowInvalid: body.allowInvalid === true,
      dryRun,
    });
    ctx.body = successResponse({
      // Python fava-slim template: f"Updated entry {entry_hash}"
      message: dryRun
        ? `Would update entry ${body.entry_hash}`
        : `Updated entry ${body.entry_hash}`,
      entry_hash: result.entryHash,
      new_entry_hash: result.newEntryHash,
      new_sha256sum: result.newSha256sum,
      files: result.files,
      errors_before: result.validation.errorsBefore,
      errors_after: result.validation.errorsAfter,
      new_errors: result.validation.newErrors,
      ...(dryRun ? { preview: result.preview } : {}),
    });
  });

  // operationId: deleteSourceSlice — wire {message, entry_hash, files, errors_before, errors_after, new_errors}
  router.delete(`${base}/source-slice`, authMiddleware, async (ctx) => {
    const { journal } = servicesForRequest(ctx);
    const body = (ctx.request.body ?? {}) as {
      entry_hash: string;
      sha256sum: string;
      allowInvalid?: boolean | null;
      dryRun?: boolean | null;
    };
    const dryRun = body.dryRun === true;
    const result = await journal.deleteSourceSlice({
      ledgerId: ledgerIdOf(ctx),
      userId: "",
      entryHash: body.entry_hash,
      sha256sum: body.sha256sum,
      allowInvalid: body.allowInvalid === true,
      dryRun,
    });
    ctx.body = successResponse({
      // Python fava-slim template: f"Deleted entry {entry_hash}"
      message: dryRun
        ? `Would delete entry ${body.entry_hash}`
        : `Deleted entry ${body.entry_hash}`,
      entry_hash: result.entryHash,
      files: result.files,
      errors_before: result.validation.errorsBefore,
      errors_after: result.validation.errorsAfter,
      new_errors: result.validation.newErrors,
      ...(dryRun ? { preview: result.preview } : {}),
    });
  });

  // operationId: deleteMultiSourceSlices — wire {message, deleted_hashes, files, errors_before, errors_after, new_errors}
  // `files` names each file the write rewrote, once (w23/042).
  router.delete(`${base}/source-slices`, authMiddleware, async (ctx) => {
    const { journal } = servicesForRequest(ctx);
    const body = (ctx.request.body ?? {}) as {
      entries: { entry_hash: string; sha256sum: string }[];
      allowInvalid?: boolean | null;
      dryRun?: boolean | null;
    };
    const dryRun = body.dryRun === true;
    const result = await journal.deleteMultiSourceSlices({
      ledgerId: ledgerIdOf(ctx),
      userId: "",
      allowInvalid: body.allowInvalid === true,
      dryRun,
      entries: (body.entries ?? []).map((e) => ({
        entryHash: e.entry_hash,
        sha256sum: e.sha256sum,
      })),
    });
    const count = result.deletedHashes.length;
    ctx.body = successResponse({
      // Python: f"Deleted {n} entries: {', '.join(deleted_hashes)}"
      message: dryRun
        ? `Would delete ${count} entries: ${result.deletedHashes.join(", ")}`
        : `Deleted ${count} entries: ${result.deletedHashes.join(", ")}`,
      deleted_hashes: result.deletedHashes,
      files: result.files,
      errors_before: result.validation.errorsBefore,
      errors_after: result.validation.errorsAfter,
      new_errors: result.validation.newErrors,
      ...(dryRun ? { preview: result.preview } : {}),
    });
  });
}
