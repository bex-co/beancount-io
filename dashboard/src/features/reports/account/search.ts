import { z } from "zod";
import { normalizeListSearchOffset } from "@/common/lib/list-search-params";
import { isOneOfViews } from "@/common/lib/navigation/view-search";

/** Highest account-journal offset a URL may request (20-row pages). */
export const ACCOUNT_JOURNAL_MAX_OFFSET = 1_000_000;

/** The account page's chart views, in tab order. */
export const ACCOUNT_VIEWS = ["accountBalance", "changesOverTime"] as const;

export type AccountView = (typeof ACCOUNT_VIEWS)[number];

export const DEFAULT_ACCOUNT_VIEW: AccountView = "accountBalance";

export interface AccountJournalSearch {
  /** Account-journal page offset in rows; absent means the first page. */
  offset?: number;
  /** Selected chart; absent means the default view. */
  view?: AccountView;
}

/**
 * The account page keeps its journal position in the URL so opening a
 * transaction's source (or reloading, or sharing the link) plus browser Back
 * returns to the page that was being read. The value is untrusted — the offset
 * is coerced to a bounded non-negative integer, and anything else drops the key
 * and shows the first page rather than failing to render.
 *
 * The selected chart lives here too: a shared account/filter/time change makes
 * the ledger layout replace its Outlet, unmounting the page, so a chart held in
 * page state reverted to Account Balance on every scope edit. An unknown view
 * is dropped rather than failing to render.
 *
 * The shared account/filter/time params stay on the parent ledger route; this
 * position belongs to one account's journal and is not a shared report filter.
 */
export const accountJournalSearchSchema = z
  .object({ offset: z.unknown().optional(), view: z.unknown().optional() })
  .transform(({ offset, view }): AccountJournalSearch => {
    const bounded = normalizeListSearchOffset(
      offset,
      ACCOUNT_JOURNAL_MAX_OFFSET,
    );
    return {
      ...(bounded === undefined ? {} : { offset: bounded }),
      ...(isOneOfViews(ACCOUNT_VIEWS, view) ? { view } : {}),
    };
  });
