import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json } from "@/server/rest/v1-schemas";

export const fileParseInput = z
  .object({ s3ObjectKey: z.string(), fileFormat: z.string() })
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
  handler: ({ layers }, { identity, body }) =>
    layers.services.llm.parseFile(identity, body.s3ObjectKey, body.fileFormat),
});
