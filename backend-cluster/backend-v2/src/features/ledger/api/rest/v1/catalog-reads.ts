import { paginationSchema, booleanQuery } from "@/server/rest/v1-schemas";
import type { SearchLedgersParams } from "@/features/ledger/workflow/ledger-workflow.types";
import { z } from "@/shared/zod-openapi-setup";
import type { ILedgerWorkflow } from "@/features/ledger/workflow/ledger-workflow";
import type { Identity } from "@/server/api/identity";

const numberQuery = z.coerce.number().optional();
const listQuery = z.object({ page: numberQuery, limit: numberQuery });
const searchQuery = listQuery.extend({
  q: z.string().optional(),
  topic: booleanQuery,
  includeDesc: booleanQuery,
  uid: numberQuery,
  priorityOwnerId: numberQuery,
  teamId: numberQuery,
  starredBy: numberQuery,
  private: booleanQuery,
  isPrivate: booleanQuery,
  template: booleanQuery,
  archived: booleanQuery,
  mode: z.string().optional(),
  exclusive: booleanQuery,
  sort: z.string().optional(),
  order: z.string().optional(),
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
