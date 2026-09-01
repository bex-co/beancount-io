/**
 * View-model for the account picker: which sections the list shows for a given
 * query and chip, and where a given account sits in them. Screen-local because
 * these encode this screen's UX policy, not anything about ledger metadata.
 *
 * Kept free of any `@/` imports so the jest-lite runner can require it.
 */
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
    // one the list could show.
    const recents = topAccounts(ranking, RECENT_LIMIT, accounts);
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
