import { z } from "zod";
import {
  normalizeLedgerSearchValue,
  toLedgerFilterSearchParam,
} from "@/common/lib/ledger-search-params/parse";
import {
  normalizeListSearchOffset,
  normalizeListSearchText,
} from "@/common/lib/list-search-params";

export const OPEN_ACCOUNT_ACTION = "open-account" as const;
export const NEW_ENTRY_ACTION = "new-entry" as const;

export const JOURNAL_DIRECTIVE_ACTIONS = [
  "transaction",
  "balance",
  "note",
  "account",
] as const;

export type JournalDirectiveAction = (typeof JOURNAL_DIRECTIVE_ACTIONS)[number];

/** Sentinel for "no account-type filter"; never serialized into the URL. */
export const ACCOUNT_TYPE_ALL = "all";

/** Highest journal offset a URL may request (60-row pages → ~16k pages). */
export const JOURNAL_MAX_OFFSET = 1_000_000;

export interface AccountsActionSearch {
  action?: typeof OPEN_ACCOUNT_ACTION;
  /** Account-name substring filter; bounded in length, never trimmed. */
  search?: string;
  /**
   * Root account-type filter. Root names are per-ledger options, so the schema
   * only bounds the shape; the page coerces an unknown name back to "all".
   */
  type?: string;
}

export interface JournalActionSearch {
  account?: string;
  filter?: string;
  /** Bare years may be numbers so URL serialization stays `time=2016`. */
  time?: string | number;
  action?: typeof NEW_ENTRY_ACTION;
  directive?: JournalDirectiveAction;
  /** Journal page offset in rows; absent means the first page. */
  offset?: number;
}

export const OPEN_ACCOUNT_ACTION_SEARCH = {
  action: OPEN_ACCOUNT_ACTION,
} satisfies AccountsActionSearch;

export const NEW_TRANSACTION_ACTION_SEARCH = {
  action: NEW_ENTRY_ACTION,
  directive: "transaction",
} satisfies JournalActionSearch;

export function isJournalDirectiveAction(
  value: unknown,
): value is JournalDirectiveAction {
  return JOURNAL_DIRECTIVE_ACTIONS.some((directive) => directive === value);
}

export const accountsActionSearchSchema = z
  .object({
    action: z.unknown().optional(),
    search: z.unknown().optional(),
    type: z.unknown().optional(),
  })
  .transform((raw): AccountsActionSearch => {
    const search: AccountsActionSearch = {};
    if (raw.action === OPEN_ACCOUNT_ACTION) search.action = OPEN_ACCOUNT_ACTION;

    const text = normalizeListSearchText(raw.search);
    if (text !== undefined) search.search = text;

    const type = normalizeListSearchText(raw.type);
    if (type !== undefined && type !== ACCOUNT_TYPE_ALL) search.type = type;

    return search;
  });

export const journalActionSearchSchema = z
  .object({
    account: z.unknown().optional(),
    filter: z.unknown().optional(),
    time: z.unknown().optional(),
    offset: z.unknown().optional(),
    action: z.unknown().optional(),
    directive: z.unknown().optional(),
  })
  .transform((raw): JournalActionSearch => {
    const search: JournalActionSearch = {};

    const account = normalizeLedgerSearchValue(raw.account);
    const filter = normalizeLedgerSearchValue(raw.filter);
    const time = toLedgerFilterSearchParam(
      normalizeLedgerSearchValue(raw.time),
    );
    if (account) search.account = account;
    if (filter) search.filter = filter;
    if (time !== undefined) search.time = time;

    const offset = normalizeListSearchOffset(raw.offset, JOURNAL_MAX_OFFSET);
    if (offset !== undefined) search.offset = offset;

    if (
      raw.action === NEW_ENTRY_ACTION &&
      (raw.directive === undefined || isJournalDirectiveAction(raw.directive))
    ) {
      search.action = NEW_ENTRY_ACTION;
      if (isJournalDirectiveAction(raw.directive)) {
        search.directive = raw.directive;
      }
    }

    return search;
  });
