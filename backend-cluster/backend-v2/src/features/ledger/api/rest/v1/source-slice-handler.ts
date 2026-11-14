import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { resolveEntryHash } from "@/features/ledger/utils/entry-hash-alias";
import {
  ALLOW_INVALID_NAMES,
  DRY_RUN_NAMES,
  resolveFlagAlias,
} from "@/features/ledger/utils/flag-alias";
import { UNCHANGED_EDIT_DESCRIPTION } from "@/features/ledger/utils/entry-field-descriptions";
import { PREVIEW_FLAG_DESCRIPTION } from "@/features/ledger/utils/preview-flag-description";
import { MAX_BULK_ENTRIES } from "@/features/ledger/utils/bulk-entries-cap";
import type { ReportedProjection } from "@/features/ledger/utils/bean-check-errors";
import { ledgerPathSchema, ledgerIdOf, writeProjectionShape } from "./schemas";
import { COMMIT_SHA_DESCRIPTION } from "@/features/ledger/utils/commit-revert";
import {
  MOVE_ENTRIES_DESCRIPTION,
  MOVE_INCLUDE_FROM_DESCRIPTION,
  MOVE_TO_PATH_DESCRIPTION,
  moveEntriesParams,
} from "@/features/ledger/utils/move-entries";
// Both spellings accepted (w23/m3/t001); handlers resolve to `entryHash`
// before the service so the wire contract never sees the alias. The
// description (not `required`) carries the one-identifier rule:
// requiring `entryHash` itself would break the snake-case alias the
// m3 contract guarantees on every surface (w23/172, blocked).
const sliceRef = z
  .object({
    entryHash: z
      .string()
      .optional()
      .describe("The entry's hash. One of entryHash/entry_hash is required."),
    entry_hash: z
      .string()
      .optional()
      .describe("Alias of entryHash, as list output spells it."),
    sha256sum: z.string(),
  })
  .strict();
const allowInvalid = z
  .boolean()
  .optional()
  .describe(
    "Commit even when the write would add bean-check errors (VALIDATION_FAILED with newLedgerErrors), instead of refusing it.",
  );
// Twin (w23/m9/t003): no surface spells it `allow_invalid` yet — the
// twin exists so snake_case callers need not memorize the exception.
const allow_invalid = z.boolean().optional().describe("Alias of allowInvalid.");
const dryRun = z.boolean().optional().describe(PREVIEW_FLAG_DESCRIPTION);
// Twin (w23/m9/t002): MCP spells it `dry_run`.
const dry_run = z
  .boolean()
  .optional()
  .describe("Alias of dryRun, as MCP spells it.");
export const deleteSliceInput = sliceRef.extend({
  allowInvalid,
  allow_invalid,
  dryRun,
  dry_run,
});
export const deleteSlicesInput = z
  .object({
    entries: z.array(sliceRef).max(MAX_BULK_ENTRIES, {
      message: `at most ${MAX_BULK_ENTRIES} entries per call; split into several calls`,
    }),
    allowInvalid,
    allow_invalid,
    dryRun,
    dry_run,
  })
  .strict();
export const updateSliceInput = deleteSliceInput.extend({
  newContent: z.string(),
});
export const moveSlicesInput = deleteSlicesInput.extend({
  // The ledger judges both paths, so every surface refuses the same ones.
  toPath: z.string().describe(MOVE_TO_PATH_DESCRIPTION),
  includeFrom: z.string().optional().describe(MOVE_INCLUDE_FROM_DESCRIPTION),
});
/**
 * `files` is MCP's write outcome (`wrote`); REST keeps its documented shape.
 * The service's nested projection flattens onto the response, as the append
 * result publishes it (w23/161).
 */
const forRest = <
  T extends { files: string[]; validation: ReportedProjection },
>({
  files: _files,
  validation,
  ...result
}: T) => ({
  ...result,
  errorsBefore: validation.errorsBefore,
  errorsAfter: validation.errorsAfter,
  newErrors: validation.newErrors,
  valid: validation.valid,
});
const previewFile = z.object({ path: z.string(), text: z.string() });
export const deleteSliceResult = z.object({
  message: z.string(),
  dryRun: z.boolean(),
  entryHash: z.string(),
  preview: z
    .array(previewFile)
    .describe("Per-file affected text; populated on dry runs only."),
  commit: z.string().optional().describe(COMMIT_SHA_DESCRIPTION),
  ...writeProjectionShape,
});
export const deleteSlicesResult = z.object({
  message: z.string(),
  dryRun: z.boolean(),
  deletedCount: z.number().int(),
  preview: z
    .array(previewFile)
    .describe("Per-file affected text; populated on dry runs only."),
  commit: z.string().optional().describe(COMMIT_SHA_DESCRIPTION),
  ...writeProjectionShape,
});
export const updateSliceResult = deleteSliceResult.extend({
  newSha256sum: z.string(),
  unchanged: z.boolean().describe(UNCHANGED_EDIT_DESCRIPTION),
  newEntryHash: z
    .string()
    .describe(
      "The entry's public ID after the commit, re-read post-commit — use it for the next edit, not the request's entryHash.",
    ),
});
export const moveSlicesResult = z.object({
  message: z.string(),
  dryRun: z.boolean(),
  movedHashes: z
    .array(z.string())
    .describe("The moved entries' hashes, each once, in ledger order."),
  toPath: z.string(),
  includeAdded: z
    .boolean()
    .describe(
      "Whether includeFrom gained toPath's include line (on a preview, would gain it).",
    ),
  preview: z
    .array(previewFile)
    .describe("Each moved entry's text at the file it leaves."),
  commit: z.string().optional().describe(COMMIT_SHA_DESCRIPTION),
  ...writeProjectionShape,
});
const description =
  "Modify entry source using the current sha256sum from entry context. Ledger content-write authority is checked before delegation. Stale source hashes are refused by the ledger service. An update returns the entry's new hash — the request's entryHash is stale after the commit. An update or delete that would add bean-check errors the ledger did not have — deleting an entry a balance assertion depends on, re-dating it past one — is refused with VALIDATION_FAILED, naming each new error in newLedgerErrors; errors the ledger already had never block, and `allowInvalid: true` commits anyway. When the only new error is imbalance, the refusal is UNBALANCED with the residual instead. An update that would take a free ledger past its directive limit is refused with RESOURCE_LIMIT_REACHED, naming the limit and the projected count; deletes always pass. `dryRun` previews without committing: same checks, per-file affected text, no hashes.";
export const SOURCE_SLICE_ROUTES = [
  v1Route({
    method: "post",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/entry-source/delete",
    summary: "Delete one entry source slice",
    description,
    params: ledgerPathSchema,
    query: z.object({}).strict(),
    body: deleteSliceInput,
    responses: { 200: json("Deleted entry", deleteSliceResult) },
    handler: ({ layers }, { identity, params, body }) =>
      layers.services.ledgerJournal
        .deleteSourceSlice({
          identity,
          ledgerId: ledgerIdOf(params),
          entryHash: resolveEntryHash(body),
          sha256sum: body.sha256sum,
          allowInvalid: resolveFlagAlias(
            { primary: body.allow_invalid, legacy: body.allowInvalid },
            ALLOW_INVALID_NAMES,
          ),
          dryRun: resolveFlagAlias(
            { primary: body.dry_run, legacy: body.dryRun },
            DRY_RUN_NAMES,
          ),
        })
        .then(forRest),
  }),
  v1Route({
    method: "post",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/entry-source/delete-many",
    summary: "Delete multiple entry source slices",
    description,
    params: ledgerPathSchema,
    query: z.object({}).strict(),
    body: deleteSlicesInput,
    responses: { 200: json("Deleted entries", deleteSlicesResult) },
    handler: ({ layers }, { identity, params, body }) =>
      layers.services.ledgerJournal
        .deleteMultiSourceSlices({
          identity,
          ledgerId: ledgerIdOf(params),
          entries: body.entries.map((entry) => ({
            entryHash: resolveEntryHash(entry),
            sha256sum: entry.sha256sum,
          })),
          allowInvalid: resolveFlagAlias(
            { primary: body.allow_invalid, legacy: body.allowInvalid },
            ALLOW_INVALID_NAMES,
          ),
          dryRun: resolveFlagAlias(
            { primary: body.dry_run, legacy: body.dryRun },
            DRY_RUN_NAMES,
          ),
        })
        .then(forRest),
  }),
  v1Route({
    method: "post",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/entries/move",
    summary: "Move entries into another file",
    description: `${MOVE_ENTRIES_DESCRIPTION} \`dryRun\` previews without committing: each moved entry's text and file. POST …/revert-commit undoes the commit.`,
    params: ledgerPathSchema,
    query: z.object({}).strict(),
    body: moveSlicesInput,
    responses: { 200: json("Moved entries", moveSlicesResult) },
    handler: ({ layers }, { identity, params, body }) =>
      layers.services.ledgerJournal
        .moveSourceSlices({
          identity,
          ledgerId: ledgerIdOf(params),
          ...moveEntriesParams(body),
        })
        .then(forRest),
  }),
  v1Route({
    method: "put",
    path: "/api-gateway/v1/ledgers/{owner}/{name}/entry-source",
    summary: "Update an entry source slice",
    description,
    params: ledgerPathSchema,
    query: z.object({}).strict(),
    body: updateSliceInput,
    responses: {
      200: json("Updated entry and source hash", updateSliceResult),
    },
    handler: ({ layers }, { identity, params, body }) =>
      layers.services.ledgerJournal
        .updateSourceSlice({
          identity,
          ledgerId: ledgerIdOf(params),
          entryHash: resolveEntryHash(body),
          sha256sum: body.sha256sum,
          newContent: body.newContent,
          allowInvalid: resolveFlagAlias(
            { primary: body.allow_invalid, legacy: body.allowInvalid },
            ALLOW_INVALID_NAMES,
          ),
          dryRun: resolveFlagAlias(
            { primary: body.dry_run, legacy: body.dryRun },
            DRY_RUN_NAMES,
          ),
        })
        .then(forRest),
  }),
];
