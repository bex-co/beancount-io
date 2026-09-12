type DrawerLedger = {
  id: string;
  name: string;
  fullName: string;
  private?: boolean;
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
  const separator = selectedId?.indexOf("/") ?? -1;
  if (selectedId && separator > 0 && separator < selectedId.length - 1) {
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

/** `open_ledger/minimax` → `open_ledger`. */
export function getLedgerOwner(fullName: string): string {
  const separator = fullName.indexOf("/");
  return separator > 0 ? fullName.slice(0, separator) : fullName;
}

export type LedgerOwnerSection<T> = {
  owner: string;
  data: T[];
};

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
 * Matching runs against `owner/name` together, so typing an account name
 * brings up that account's books and typing a ledger name finds it whoever
 * owns it. An empty or whitespace query matches everything. */
export function filterLedgers<T extends { fullName: string }>(
  ledgers: readonly T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [...ledgers];
  }
  return ledgers.filter((ledger) =>
    ledger.fullName.toLowerCase().includes(needle),
  );
}
