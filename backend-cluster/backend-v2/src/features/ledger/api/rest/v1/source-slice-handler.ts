import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { ledgerPathSchema, ledgerIdOf } from "./schemas";
export const deleteSliceInput = z
  .object({ entryHash: z.string(), sha256sum: z.string() })
  .strict();
export const deleteSlicesInput = z
  .object({ entries: z.array(deleteSliceInput) })
  .strict();
export const updateSliceInput = deleteSliceInput.extend({
  newContent: z.string(),
});
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
  "Modify entry source using the current sha256sum from entry context. Ledger content-write authority is checked before delegation. Stale source hashes are refused by the ledger service. An update returns the entry's new hash — the request's entryHash is stale after the commit. No preview.";
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
      layers.services.ledgerJournal.deleteSourceSlice({
        identity,
        ledgerId: ledgerIdOf(params),
        ...body,
      }),
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
      layers.services.ledgerJournal.deleteMultiSourceSlices({
        identity,
        ledgerId: ledgerIdOf(params),
        ...body,
      }),
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
      layers.services.ledgerJournal.updateSourceSlice({
        identity,
        ledgerId: ledgerIdOf(params),
        ...body,
      }),
  }),
];
