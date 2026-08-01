export type LedgerOwnerSection<T> = {
  owner: string;
  data: T[];
};

const getOwner = (fullName: string): string => {
  const separatorIndex = fullName.indexOf("/");
  return separatorIndex > 0 ? fullName.slice(0, separatorIndex) : fullName;
};

/** Groups ledgers without changing the API's owner or ledger ordering. */
export const groupLedgersByOwner = <T extends { fullName: string }>(
  ledgers: readonly T[],
): LedgerOwnerSection<T>[] => {
  const sectionsByOwner = new Map<string, LedgerOwnerSection<T>>();

  for (const ledger of ledgers) {
    const owner = getOwner(ledger.fullName);
    const section = sectionsByOwner.get(owner);

    if (section) {
      section.data.push(ledger);
    } else {
      sectionsByOwner.set(owner, { owner, data: [ledger] });
    }
  }

  return Array.from(sectionsByOwner.values());
};
