import { paginationSchema, booleanQuery } from "@/server/rest/v1-schemas";
import type { SearchLedgersParams } from "@/features/ledger/workflow/ledger-workflow.types";
import { z } from "@/shared/zod-openapi-setup";
import type { ILedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import type { Identity } from "@/server/api/identity";

const numberQuery = z.coerce.number().optional();
const listQuery = z.object({ page: numberQuery, limit: numberQuery }).strict();
// The same bounds as every other catalog list; the workflow holds GraphQL to
// them too (w23/019).
const idQuery = z.coerce.number().int().min(1).optional();
const searchQuery = paginationSchema.extend({
  q: z.string().optional(),
  topic: booleanQuery,
  includeDesc: booleanQuery,
  uid: idQuery,
  priorityOwnerId: idQuery,
  teamId: idQuery,
  starredBy: idQuery,
  private: booleanQuery,
  isPrivate: booleanQuery,
  template: booleanQuery,
  archived: booleanQuery,
  mode: z.string().optional(),
  exclusive: booleanQuery,
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

/** Account-catalog operations delegate authority and result mapping to the workflow. */
export const CATALOG_READS = [
  {
    segment: "",
    name: "accessibleLedgers",
    summary:
      "List the caller's accessible ledgers, restricted to the credential's ledger pin when present",
    query: paginationSchema,
    fetch: (
      workflow: ILedgerWorkflow,
      identity: Identity,
      query: SearchLedgersParams,
    ) => workflow.listLedgers({ identity, args: query }),
  },
  {
    segment: "owned",
    name: "ownedLedgers",
    summary: "List the caller's owned ledgers",
    query: listQuery,
    fetch: (
      workflow: ILedgerWorkflow,
      identity: Identity,
      query: SearchLedgersParams,
    ) => workflow.listUserOwnedLedgers({ identity, args: query }),
  },
  {
    segment: "search",
    name: "searchLedgers",
    summary:
      "Search ledgers with ownership, visibility, sorting, and pagination filters",
    query: searchQuery,
    fetch: (
      workflow: ILedgerWorkflow,
      identity: Identity,
      query: SearchLedgersParams,
    ) => workflow.searchLedgers({ identity, args: query }),
  },
] as const;
