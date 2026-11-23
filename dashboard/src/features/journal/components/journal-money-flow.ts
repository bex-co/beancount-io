import type { JournalTransaction } from "@/common/types/journal";

/**
 * Where the money went: the account it left (the first posting taken from)
 * and the one it reached (the first posting added to), and how many more
 * accounts the entry touches. Null when it does not move between two.
 */
export function moneyFlow(
  transaction: JournalTransaction,
): { from: string; to: string; more: number } | null {
  const from: string[] = [];
  const to: string[] = [];
  for (const posting of transaction.postings ?? []) {
    const side = Number(posting.units?.number) < 0 ? from : to;
    if (!side.includes(posting.account)) side.push(posting.account);
  }
  if (!from.length || !to.length) return null;
  const touched = new Set([...from, ...to]).size;
  return { from: from[0], to: to[0], more: touched - 2 };
}

/**
 * The shortest suffix that distinguishes each account in this group.
 * Compare paths at the same depth so every colliding leaf is qualified.
 */
export function shortAccountNames(accounts: readonly string[]): string[] {
  const paths = accounts.map((account) => account.split(":"));
  return paths.map((path, index) => {
    const account = accounts[index];
    for (let count = 1; count < path.length; count++) {
      const suffix = path.slice(-count).join(":");
      const matchesAnother = paths.some(
        (other, otherIndex) =>
          accounts[otherIndex] !== account &&
          other.slice(-count).join(":") === suffix,
      );
      if (!matchesAnother) return suffix;
    }
    return account;
  });
}

export function shortAccountPair(
  from: string,
  to: string,
): { from: string; to: string } {
  const [fromLabel, toLabel] = shortAccountNames([from, to]);
  return { from: fromLabel, to: toLabel };
}
