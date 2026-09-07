import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
export const legacyEntriesInput = z.strictObject({
  ledgerId: z.string().nullish(),
  entriesInput: z.array(
    z.strictObject({
      type: z.string(),
      date: z.string(),
      flag: z.string(),
      meta: z.record(z.string(), z.unknown()),
      narration: z.string(),
      payee: z.string(),
      postings: z.array(
        z.strictObject({ account: z.string(), amount: z.string() }),
      ),
    }),
  ),
});
export const legacyEntriesResult = z.object({
  data: z.string(),
  success: z.boolean(),
});
export const legacyEntryRoute = v1Route({
  method: "post",
  path: "/api-gateway/v1/legacy/entries",
  summary: "Insert entries using the legacy transaction contract",
  description:
    "Compatibility for GraphQL addEntries: Transaction payloads with amount strings, legacy metadata accepted but ignored, and explicit-ledger/pin/first-ledger fallback. Uses normal web quotas. No preview.",
  query: z.object({}).strict(),
  body: legacyEntriesInput,
  responses: { 200: json("Legacy insertion result", legacyEntriesResult) },
  handler: ({ layers }, { identity, body }) =>
    layers.workflows.legacyEntry.addEntries({
      identity,
      ...body,
      platform: "web",
    }),
});
