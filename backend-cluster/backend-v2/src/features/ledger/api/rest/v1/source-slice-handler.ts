import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { resolveEntryHash } from "@/features/ledger/utils/entry-hash-alias";
import { ledgerPathSchema, ledgerIdOf } from "./schemas";
// Both spellings accepted (w23/m3/t001); handlers resolve to `entryHash`
// before the service so the wire contract never sees the alias.
const sliceRef = z
  .object({
    entryHash: z.string().optional().describe("The entry's hash."),
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
export const deleteSliceInput = sliceRef.extend({ allowInvalid });
export const deleteSlicesInput = z
  .object({ entries: z.array(sliceRef), allowInvalid })
  .strict();
export const updateSliceInput = deleteSliceInput.extend({
  newContent: z.string(),
});
/** `files` is MCP's write outcome (`wrote`); REST keeps its documented shape. */
const withoutFiles = <T extends { files: string[] }>({
  files: _files,
  ...result
}: T) => result;
export const deleteSliceResult = z.object({
  message: z.string(),
  entryHash: z.string(),
});
export const deleteSlicesResult = z.object({
  message: z.string(),
  deletedCount: z.number().int(),
});
export const updateSliceResult = deleteSliceResult.extend({
  newSha256sum: z.string(),
  newEntryHash: z
    .string()
    .describe(
      "The entry's public ID after the commit, re-read post-commit — use it for the next edit, not the request's entryHash.",
    ),
});
const description =
  "Modify entry source using the current sha256sum from entry context. Ledger content-write authority is checked before delegation. Stale source hashes are refused by the ledger service. An update returns the entry's new hash — the request's entryHash is stale after the commit. An update or delete that would add bean-check errors the ledger did not have — deleting an entry a balance assertion depends on, re-dating it past one — is refused with VALIDATION_FAILED, naming each new error in newLedgerErrors; errors the ledger already had never block, and `allowInvalid: true` commits anyway. When the only new error is imbalance, the refusal is UNBALANCED with the residual instead. An update that would take a free ledger past its directive limit is refused with RESOURCE_LIMIT_REACHED, naming the limit and the projected count; deletes always pass. No preview.";
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
          allowInvalid: body.allowInvalid,
        })
        .then(withoutFiles),
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
          allowInvalid: body.allowInvalid,
        })
        .then(withoutFiles),
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
          allowInvalid: body.allowInvalid,
        })
        .then(withoutFiles),
  }),
];
