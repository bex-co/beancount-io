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
 * The two accounts by their last names, the part that tells them apart;
 * one more segment each while those still match, so a transfer from
 * Assets:US:Hooli:Vacation to Expenses:Vacation reads "Hooli:Vacation →
 * Expenses:Vacation", not "Vacation → Vacation".
 */
export function shortAccountPair(
  from: string,
  to: string,
): { from: string; to: string } {
  const tail = (account: string, count: number) =>
    account.split(":").slice(-count).join(":");
  let count = 1;
  while (count < 4 && tail(from, count) === tail(to, count) && from !== to) {
    count += 1;
  }
  return { from: tail(from, count), to: tail(to, count) };
}
