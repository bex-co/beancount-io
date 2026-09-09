import { z } from "zod";
import { normalizeLedgerSearchValue, toLedgerFilterSearchParam } from "./parse";

/**
 * Parent-ledger search schema for the shared account/filter/time filters.
 * Optional keys omit from the validated object when empty so URLs stay clean.
 */
export const ledgerFilterSearchSchema = z
  .object({
    account: z.unknown().optional(),
    filter: z.unknown().optional(),
    time: z.unknown().optional(),
  })
  .transform((raw) => {
    const account = normalizeLedgerSearchValue(raw.account);
    const filter = normalizeLedgerSearchValue(raw.filter);
    const time = normalizeLedgerSearchValue(raw.time);
    const search: {
      account?: string;
      filter?: string;
      time?: string | number;
    } = {};
    if (account) search.account = account;
    if (filter) search.filter = filter;
    const timeParam = toLedgerFilterSearchParam(time);
    if (timeParam !== undefined) search.time = timeParam;
    return search;
  });

export type LedgerFilterSearch = z.infer<typeof ledgerFilterSearchSchema>;
