/**
 * A ledger id is `owner/name`, and renaming the account renames the owner of
 * every ledger it holds. The id the app remembers (the selected ledger, Recent
 * accounts, merchant marks) then names a ledger that no longer exists, and the
 * server answers FORBIDDEN for it (w21/226). These rewrite the old owner to the
 * new one; an id under another owner (a shared ledger) is left alone.
 */
export function renamedLedgerId(
  ledgerId: string,
  oldOwner: string,
  newOwner: string,
): string {
  const prefix = `${oldOwner}/`;
  return oldOwner && ledgerId.startsWith(prefix)
    ? `${newOwner}/${ledgerId.slice(prefix.length)}`
    : ledgerId;
}

/** Each ledger id to the one it goes by now. */
export type LedgerIdMap = (ledgerId: string) => string;

/** A record keyed by ledger id, re-keyed by `map`. */
export function rekeyLedgers<T>(
  record: Readonly<Record<string, T>>,
  map: LedgerIdMap,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record).map(([ledgerId, value]) => [map(ledgerId), value]),
  );
}

/** A record keyed by ledger id, re-keyed for the renamed owner. */
export function renameLedgerKeys<T>(
  record: Readonly<Record<string, T>>,
  oldOwner: string,
  newOwner: string,
): Record<string, T> {
  return rekeyLedgers(record, (ledgerId) =>
    renamedLedgerId(ledgerId, oldOwner, newOwner),
  );
}

/**
 * A value stored with the ledger it was meant for (the Transactions filters),
 * moved to the renamed owner. Readers drop it when its ledger is not the
 * selected one, so left behind it vanished with no message (w21/644).
 */
export function renamedLedgerScope<T extends { ledgerId: string | null }>(
  scoped: T,
  oldOwner: string,
  newOwner: string,
): T {
  return rescopeLedger(scoped, (ledgerId) =>
    renamedLedgerId(ledgerId, oldOwner, newOwner),
  );
}

/** A value stored with its ledger, moved by `map`. */
export function rescopeLedger<T extends { ledgerId: string | null }>(
  scoped: T,
  map: LedgerIdMap,
): T {
  if (scoped.ledgerId === null) return scoped;
  const ledgerId = map(scoped.ledgerId);
  return ledgerId === scoped.ledgerId ? scoped : { ...scoped, ledgerId };
}

/**
 * The name a ledger renamed on the web goes by now. The server answers the old
 * `owner/name` through the host's redirect with the new one, and the app kept
 * the old: the drawer listed the ledger twice, a "Current ledger" row under
 * the old name above the real one, and what was remembered for it stayed on
 * the old id (w21/801). Null when the answer names the selection itself, or
 * the selection is not an `owner/name`.
 */
export function canonicalLedgerId(
  selected: string | null,
  answered: { fullName?: string | null } | null | undefined,
): string | null {
  const fullName = answered?.fullName ?? "";
  const isPath = (id: string) => {
    const separator = id.indexOf("/");
    return separator > 0 && separator < id.length - 1;
  };
  if (!selected || !isPath(selected) || !isPath(fullName)) return null;
  return fullName === selected ? null : fullName;
}
