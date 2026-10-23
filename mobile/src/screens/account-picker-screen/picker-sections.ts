/**
 * View-model for the account picker: which sections the list shows for a given
 * query and chip, and where a given account sits in them. Screen-local because
 * these encode this screen's UX policy, not anything about ledger metadata.
 *
 * Kept free of any `@/` imports so the jest-lite runner can require it.
 */
import {
  nameKey,
  openOn,
  type CloseDates,
} from "../../common/account-close-dates";
import { filterAccounts } from "../../common/account-search";
import {
  topAccounts,
  type RankingContext,
} from "../../common/account-frecency";
import { type AccountSection } from "../../common/ledger-meta-utils";

/** The "All" chip — no root filter applied. */
export const ALL_ROOTS = null;

/**
 * How many accounts the pinned Recent block holds. Five is what fits above the
 * fold next to the chips without pushing the browse list off screen — past
 * that, scanning the block costs more than the scroll it saves.
 */
export const RECENT_LIMIT = 5;

/** Which of the three ways to reach an account a row represents. */
type SelectionSource = "recents" | "search" | "browse";

/**
 * A section of the picker list. `source` is stamped where the section is built,
 * because that is the only place that knows it for certain — deriving it at
 * render from a flag plus "is a query active" would admit combinations this
 * function never produces.
 */
export interface PickerSection extends AccountSection {
  source: SelectionSource;
}

/** What the sections are ranked and pinned from. */
export interface PickerSectionOptions {
  /** The ledger's usage and the instant to rank it against. */
  ranking?: RankingContext;
  /** Localized header for the pinned block; pinning needs this and `ranking`. */
  recentTitle?: string;
}

/** Whether the query is narrowing the list, as opposed to plain browsing. */
export function isSearchQuery(query: string): boolean {
  return query.trim().length > 0;
}

/**
 * A query spans every root — the chip filter would only hide matches — so it
 * collapses to one section of ranked results; otherwise the chip narrows the
 * grouped browse list (`sections`, grouped once by the caller), under a pinned
 * Recent block whenever there is usage to pin.
 *
 * A lone section carries an empty title: with nothing to tell apart, a header
 * is just a band of chrome. Callers render a header only when `title` is set,
 * so the rule lives here rather than being re-derived from the array length —
 * and it is why the recents live here too: pinning a titled block above an
 * untitled one would leave the browse rows looking like part of it.
 */
export function visibleAccountSections(
  sections: AccountSection[],
  accounts: string[],
  query: string,
  activeRoot: string | null,
  { ranking, recentTitle }: PickerSectionOptions = {},
): PickerSection[] {
  if (isSearchQuery(query)) {
    // No pinned block here: a query already says what the user is after, and
    // recents would only push the answer further down the screen. Usage still
    // ranks, though — it breaks ties between equally-good matches.
    const matches = filterAccounts(query, accounts, ranking);
    // No sections at all, not one empty section: SectionList counts a section
    // as two virtual items (header + footer) even with no data, so
    // `ListEmptyComponent` — the no-results text and the create row — only
    // renders when this array is itself empty.
    return matches.length === 0
      ? []
      : [{ title: "", data: matches, source: "search" }];
  }
  const visible = (
    activeRoot === ALL_ROOTS
      ? sections
      : sections.filter(({ title }) => title === activeRoot)
  ).map((section) => ({ ...section, source: "browse" as const }));

  if (ranking && recentTitle) {
    // `accounts` is what this picker can offer, so a pinned account is always
    // one the list could show — and, under a root chip, one under that root:
    // narrowing to Expenses must not offer Assets:Cash first (w21/021).
    const offered =
      activeRoot === ALL_ROOTS
        ? accounts
        : accounts.filter(
            (account) =>
              account === activeRoot || account.startsWith(`${activeRoot}:`),
          );
    const recents = topAccounts(ranking, RECENT_LIMIT, offered);
    if (recents.length > 0) {
      return [
        { title: recentTitle, data: recents, source: "recents" },
        ...visible,
      ];
    }
  }
  return visible.length > 1
    ? visible
    : visible.map((s) => ({ ...s, title: "" }));
}

/** What the picker knows about the caller's write access to this ledger. */
export interface LedgerWriteAccess {
  /** True only once the ledger's permissions resolved and allow writing. */
  canWrite: boolean;
  /** The permission query is still in flight. */
  loading?: boolean;
  /** The permission query failed. */
  error?: unknown;
}

/**
 * A filter picker only reads: its Create row opened Open Account, whose Done
 * would write an `open` from a filter (w21/528).
 */
function offersCreate(type?: string): boolean {
  return type !== "filter";
}

/**
 * Whether the create-account row belongs in the empty state. It renders exactly
 * when a query matched nothing (no sections at all — see
 * `visibleAccountSections`), or the picker has no accounts at all (a new
 * ledger, w21/643), *and* the caller may write to this ledger:
 * offering Create to a read-only collaborator only walks them into the open
 * account screen's write guard.
 *
 * Anything unresolved counts as read-only, so the row never flashes enabled
 * before permissions land: `canWrite` is false until the ledger's own
 * permissions have been read back (and on error), and this re-checks both.
 */
export function showCreateAccountRow(
  query: string,
  visibleSectionCount: number,
  access: LedgerWriteAccess,
  type?: string,
  hasAccounts = true,
): boolean {
  if (!offersCreate(type) || !access.canWrite || access.error) {
    return false;
  }
  return (isSearchQuery(query) || !hasAccounts) && visibleSectionCount === 0;
}

/**
 * Whether the create-account row also belongs under search results. The
 * scattered-letter matcher finds something for almost any word ("pets" in
 * `Expenses:Transport:Tram`), which left a genuinely new name with no way to
 * create it (w21/258). The row follows the results whenever no result contains
 * every word of the query as a contiguous piece of its name — a name the
 * ledger already has is a real hit and needs no Create. Same access rules as
 * the empty state's row.
 */
export function showCreateBelowResults(
  query: string,
  results: readonly string[],
  access: LedgerWriteAccess,
  type?: string,
): boolean {
  if (
    !offersCreate(type) ||
    !access.canWrite ||
    access.error ||
    results.length === 0
  ) {
    return false;
  }
  const words = nameKey(query.trim()).split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  // A query that starts at a root account ("Expenses:Food") is a whole name,
  // not a piece of one: it is a hit only when the ledger has exactly that
  // account, so a new "Expenses:Food" beside "Expenses:Food:Groceries" can
  // still be created (w21/452). A partial path ("food:groc") stays a piece.
  const wholeName = nameKey(query)
    .split(":")
    .map((part) => part.trim())
    .join(":");
  const rootOf = (name: string) => name.split(":")[0];
  if (
    wholeName.includes(":") &&
    results.some((account) => rootOf(nameKey(account)) === rootOf(wholeName))
  ) {
    return !results.some((account) => nameKey(account) === wholeName);
  }
  return !results.some((account) => {
    const name = nameKey(account);
    return words.every((word) => name.includes(word));
  });
}

/** Where an account sits in rendered sections, for scrolling it into view. */
export function findAccountLocation(
  sections: AccountSection[],
  account: string | undefined,
): { sectionIndex: number; itemIndex: number } | null {
  if (!account) {
    return null;
  }
  for (const [sectionIndex, section] of sections.entries()) {
    const itemIndex = section.data.indexOf(account);
    if (itemIndex !== -1) {
      return { sectionIndex, itemIndex };
    }
  }
  return null;
}

/**
 * The accounts plus every parent between their root and themselves, each
 * parent just before its first child: `Expenses:Food` ahead of
 * `Expenses:Food:Groceries`. The ledger lists only opened accounts, so a
 * category could not be chosen to filter by, though the server filters by a
 * parent and the Accounts tab opens one as a combined journal (w21/036).
 * Only a filter may offer these — a posting can't target an unopened parent.
 */
export function withParentAccounts(accounts: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const account of accounts) {
    const parts = account.split(":");
    for (let depth = 2; depth < parts.length; depth++) {
      const parent = parts.slice(0, depth).join(":");
      if (!seen.has(parent)) {
        seen.add(parent);
        result.push(parent);
      }
    }
    if (!seen.has(account)) {
      seen.add(account);
      result.push(account);
    }
  }
  return result;
}

/**
 * The accounts a picker lists. A filter keeps every opened account plus their
 * parents (w21/036). A budget is offered the accounts open today plus their
 * parents too: "Food: 600 a month" across its children is the commonest budget,
 * the server rolls children up by prefix, and a budget's account need not be
 * opened itself, so `Expenses:Food` was reachable only through a spurious
 * `open` (w21/396), and so are the roots (w21/876). A posting gets only
 * accounts open on its date.
 */
export function pickerAccounts(
  type: string,
  opened: readonly string[],
  onDate: string,
  closeDates: CloseDates,
): string[] {
  if (type === "filter") return withParentAccounts(opened);
  const open = openOn(opened, onDate, closeDates);
  if (type !== "budget") return open;
  // And the roots themselves, each ahead of its accounts: "Total monthly
  // spending" budgets Expenses whole, and the server rolls its children up by
  // prefix (w21/876).
  const roots = [...new Set(open.map((account) => account.split(":")[0]!))];
  return [
    ...roots.filter((root) => !open.includes(root)),
    ...withParentAccounts(open),
  ];
}
