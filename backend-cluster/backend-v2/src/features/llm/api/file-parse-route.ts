import { requestPlatform } from "@/server/api/request-platform";
import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";
import { resolveObjectKey } from "@/features/ledger/utils/object-key-alias";

export const fileParseInput = z
  .object({
    s3ObjectKey: z.string().optional(),
    fileFormat: z.string(),
    // Twins (w23/m11/t002): every key spelling works at every input.
    objectKey: z
      .string()
      .optional()
      .describe("Alias of s3ObjectKey, as the upload URL spells it."),
    receiptObjectKey: z
      .string()
      .optional()
      .describe("Alias of s3ObjectKey, as the insert path spells it."),
  })
  .strict();
export const fileParseResult = z.object({
  rows: z.array(
    z.object({
      date: z.string(),
      payee: z.string(),
      description: z.string(),
      amount: z.number(),
    }),
  ),
});
export const fileParseRoute = v1Route({
  method: "post",
  path: "/api-gateway/v1/import/parse-file",
  summary: "Parse an uploaded file into transactions",
  description:
    "Parse a caller-owned temporary upload using the supplied fileFormat. Requires AI-use and temporary-asset authority and consumes AI quota. Returns rows without writing ledger entries. No preview or ledger selector.",
  query: z.object({}).strict(),
  body: fileParseInput,
  responses: { 200: json("Parsed transaction rows", fileParseResult) },
  handler: ({ layers }, { identity, body, ctx }) =>
    layers.services.llm.parseFile(
      identity,
      resolveObjectKey(body),
      body.fileFormat,
      requestPlatform(ctx.headers),
    ),
});
