import { z } from "zod";
import {
  normalizeListSearchCount,
  normalizeListSearchText,
} from "@/common/lib/list-search-params";

export const USER_PROFILE_TABS = [
  "overview",
  "starred",
  "following",
  "followers",
] as const;

export type UserProfileTab = (typeof USER_PROFILE_TABS)[number];

/** Ledgers revealed per "Show more" page in the public collection. */
export const LEDGER_COLLECTION_PAGE_SIZE = 12;

/**
 * Upper bound for the persisted "show" count. A profile cannot show more
 * ledgers than it has; this only stops an absurd URL from asking for millions
 * of rows before the real result count is known.
 */
export const LEDGER_COLLECTION_MAX_SHOW = 600;

export const LEDGER_COLLECTION_SORTS = ["updated", "name"] as const;

export type LedgerCollectionSort = (typeof LEDGER_COLLECTION_SORTS)[number];

export const DEFAULT_LEDGER_COLLECTION_SORT: LedgerCollectionSort = "updated";

export function isLedgerCollectionSort(
  value: unknown,
): value is LedgerCollectionSort {
  return LEDGER_COLLECTION_SORTS.some((sort) => sort === value);
}

export interface UserProfileSearch {
  tab?: UserProfileTab;
  /** Ledger-collection query; bounded, never trimmed. */
  q?: string;
  /** Ledger-collection ordering; absent means the default ordering. */
  sort?: LedgerCollectionSort;
  /** Ledgers revealed so far; absent means the first page. */
  show?: number;
}

/**
 * The public profile keeps the ledger collection's search, ordering, and
 * revealed count in the URL so opening a ledger and pressing Back rebuilds the
 * same list. Unknown sorts and unusable counts coerce to the defaults instead of
 * throwing; `tab` keeps its original strict validation.
 */
export const userProfileSearchSchema = z
  .object({
    tab: z.enum(USER_PROFILE_TABS).optional(),
    q: z.unknown().optional(),
    sort: z.unknown().optional(),
    show: z.unknown().optional(),
  })
  .transform((raw): UserProfileSearch => {
    const search: UserProfileSearch = {};
    if (raw.tab !== undefined) search.tab = raw.tab;

    const query = normalizeListSearchText(raw.q);
    if (query !== undefined) search.q = query;

    if (
      isLedgerCollectionSort(raw.sort) &&
      raw.sort !== DEFAULT_LEDGER_COLLECTION_SORT
    ) {
      search.sort = raw.sort;
    }

    const show = normalizeListSearchCount(raw.show, {
      step: LEDGER_COLLECTION_PAGE_SIZE,
      max: LEDGER_COLLECTION_MAX_SHOW,
    });
    if (show !== undefined) search.show = show;

    return search;
  });
