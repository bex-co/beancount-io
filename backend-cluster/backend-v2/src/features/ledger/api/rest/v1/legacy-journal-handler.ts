import { z } from "@/shared/zod-openapi-setup";
import { v1Route } from "@/server/rest/v1-route";
import { json, booleanQuery } from "@/server/rest/v1-schemas";
import { jsonStringArrayQuery } from "./journal-reads";

export const legacyJournalQuery = z.object({
  first: z.coerce.number().int().optional(),
  after: z.string().optional(),
  last: z.coerce.number().int().optional(),
  before: z.string().optional(),
  detailed: booleanQuery,
  searchQuery: z.string().optional(),
  accountFilter: z.string().optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
  entryTypes: jsonStringArrayQuery.optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
  groupBy: z.string().optional(),
});

export const LEGACY_JOURNAL_ROUTES = [
  v1Route({
    method: "get",
    path: "/api-gateway/v1/legacy/journal-entries",
    summary: "Read legacy journal entries",
    description:
      "The journalEntries compatibility contract, including enhanced postings, computed entry fields, and cursor metadata. Uses the credential pin or caller's first ledger, as in GraphQL. entryTypes is a JSON-encoded string array.",
    query: legacyJournalQuery,
    responses: { 200: json("Legacy journal envelope") },
    handler: async ({ layers }, { identity, query }) =>
      layers.workflows.ledger.getLegacyJournal({ identity, args: query }),
  }),
];
