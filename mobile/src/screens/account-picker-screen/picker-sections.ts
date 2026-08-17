/**
 * View-model for the account picker: which sections the list shows for a given
 * query and chip, and where a given account sits in them. Screen-local because
 * these encode this screen's UX policy, not anything about ledger metadata.
 *
 * Kept free of any `@/` imports so the jest-lite runner can require it.
 */
import { filterAccounts } from "../../common/account-search";
import { type AccountSection } from "../../common/ledger-meta-utils";

/** The "All" chip — no root filter applied. */
export const ALL_ROOTS = null;

/** Whether the query is narrowing the list, as opposed to plain browsing. */
export function isSearchQuery(query: string): boolean {
  return query.trim().length > 0;
}

/**
 * A query spans every root — the chip filter would only hide matches — so it
 * collapses to one section of ranked results; otherwise the chip narrows the
 * grouped browse list (`sections`, grouped once by the caller).
 *
 * A lone section carries an empty title: with nothing to tell apart, a header
 * is just a band of chrome. Callers render a header only when `title` is set,
 * so the rule lives here rather than being re-derived from the array length.
 */
export function visibleAccountSections(
  sections: AccountSection[],
  accounts: string[],
  query: string,
  activeRoot: string | null,
): AccountSection[] {
  if (isSearchQuery(query)) {
    const matches = filterAccounts(query, accounts);
    // No sections at all, not one empty section: SectionList counts a section
    // as two virtual items (header + footer) even with no data, so
    // `ListEmptyComponent` — the no-results text and the create row — only
    // renders when this array is itself empty.
    return matches.length === 0 ? [] : [{ title: "", data: matches }];
  }
  const visible =
    activeRoot === ALL_ROOTS
      ? sections
      : sections.filter(({ title }) => title === activeRoot);
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
