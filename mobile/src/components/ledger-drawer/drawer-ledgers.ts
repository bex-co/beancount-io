import { ledgerMatchesQuery } from "../../common/ledger-search";

export type DrawerLedger = {
  id: string;
  name: string;
  fullName: string;
  private?: boolean;
  /** Searched with the name; the directory supplies it (w21/244). */
  description?: string | null;
  disabled?: boolean;
  statusLabel?: string;
  /** Secondary text under the name, e.g. a guest example's id (w21/294). */
  subtitle?: string;
};

/** The list the drawer shows: the user's collection, in the order the API
 * returned it, plus the active ledger when it isn't part of that collection.
 *
 * A ledger already in the collection keeps its place — the active one is
 * marked where it sits, never lifted to the top. Reordering the list around
 * the current selection means every ledger moves whenever you switch books,
 * so the position you learned for one is wrong the next time you look.
 * Only a ledger that has no place in the list at all — one opened from a
 * public link — is added, at the front, where it can't displace anything. */
export function getDrawerLedgers(
  ledgers: readonly DrawerLedger[],
  selectedId: string | null,
  selectedLedger?: DrawerLedger,
  selectedGone = false,
): DrawerLedger[] {
  const isSelected = (ledger: DrawerLedger) =>
    ledger.id === selectedId || ledger.fullName === selectedId;

  if (ledgers.some(isSelected)) {
    return [...ledgers];
  }

  if (selectedLedger && isSelected(selectedLedger)) {
    return [selectedLedger, ...ledgers];
  }

  // A canonical link identifies the book before its metadata arrives. Don't
  // invent its visibility or use stale metadata from the previous selection.
  // A ledger the server no longer has gets no row: it was pinned at the top
  // as current, and tapping it led back to "no longer available" (w21/074).
  const separator = selectedId?.indexOf("/") ?? -1;
  if (
    !selectedGone &&
    selectedId &&
    separator > 0 &&
    separator < selectedId.length - 1
  ) {
    return [
      {
        id: selectedId,
        name: selectedId.slice(separator + 1),
        fullName: selectedId,
      },
      ...ledgers,
    ];
  }

  return [...ledgers];
}

/**
 * What the list's footer adds once rows are shown. The out-of-directory
 * "Current ledger" row made a failed or loading list non-empty, so its error,
 * retry and skeleton never showed and the account read as having one ledger
 * (w21/802). An empty list says these in its own place instead.
 */
export function drawerListFooter({
  error,
  loading,
  loaded,
  shown,
}: {
  error: boolean;
  loading: boolean;
  /** Ledgers the directory returned. */
  loaded: number;
  /** Sections the list draws, the current-ledger one included. */
  shown: number;
}): "retry" | "loading" | null {
  if (error && (loaded > 0 || shown > 0)) return "retry";
  if (loading && loaded === 0 && shown > 0) return "loading";
  return null;
}

/** `open_ledger/minimax` → `open_ledger`. */
export function getLedgerOwner(fullName: string): string {
  const separator = fullName.indexOf("/");
  return separator > 0 ? fullName.slice(0, separator) : fullName;
}

export type LedgerOwnerSection<T> = {
  owner: string;
  data: T[];
  current?: boolean;
  key?: string;
};

/** Keep an out-of-directory selection separate from the stable owner groups. */
export function getDrawerSections(
  ledgers: readonly DrawerLedger[],
  selectedLedger: DrawerLedger | undefined,
  query: string,
): LedgerOwnerSection<DrawerLedger>[] {
  const sections = groupLedgersByOwner(filterLedgers(ledgers, query)).map(
    (section) => ({ ...section, key: section.owner }),
  );
  if (
    selectedLedger &&
    !ledgers.some((ledger) => ledger.fullName === selectedLedger.fullName) &&
    filterLedgers([selectedLedger], query).length
  ) {
    return [
      {
        key: "current-ledger",
        owner: getLedgerOwner(selectedLedger.fullName),
        current: true,
        data: [selectedLedger],
      },
      ...sections,
    ];
  }
  return sections;
}

/** Splits the list into one group per owning account, in the order the owners
 * first appear, which is the collection's own order. The account name belongs
 * on the group, not on every row: repeated under each ledger it was noise that
 * cost a second line of height, but a ledger with no account above it is
 * unidentifiable. */
export function groupLedgersByOwner<T extends { fullName: string }>(
  ledgers: readonly T[],
): LedgerOwnerSection<T>[] {
  const sectionsByOwner = new Map<string, LedgerOwnerSection<T>>();

  for (const ledger of ledgers) {
    const owner = getLedgerOwner(ledger.fullName);
    const section = sectionsByOwner.get(owner);
    if (section) {
      section.data.push(ledger);
    } else {
      sectionsByOwner.set(owner, { owner, data: [ledger] });
    }
  }

  return Array.from(sectionsByOwner.values());
}

/** Narrows the list to what matches `query`, in the list's own order.
 * Every word of the query must be found in `owner/name` or the description,
 * in any order, with `-`, `_` and `/` read as word breaks: typing an account
 * name brings up that account's books, "my book" finds `my-book`, and a word
 * from the description finds the ledger as Browse ledgers does (w21/244). An
 * empty or whitespace query matches everything. */
export function filterLedgers<
  T extends { fullName: string; description?: string | null },
>(ledgers: readonly T[], query: string): T[] {
  return ledgers.filter((ledger) => ledgerMatchesQuery(ledger, query));
}
