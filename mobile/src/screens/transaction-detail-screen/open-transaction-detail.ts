import { makeVar, type ReactiveVar } from "@apollo/client";
import type { useRouter } from "expo-router";
import type { JournalTransaction } from "@/screens/transactions-screen/types";

type Router = ReturnType<typeof useRouter>;

/**
 * A tapped transaction together with the ledger it was read from. An entry
 * hash identifies a transaction only *within* a ledger, so the stash is keyed
 * by both — see `selectStashedTransaction`.
 */
export type StashedTransaction = {
  ledgerId: string;
  entry: JournalTransaction;
};

/**
 * Last tapped transaction, stashed so the detail screen paints instantly.
 * The route params stay the source of truth — when the var is empty or stale
 * (deep link, remount, another ledger) the screen falls back to fetching the
 * entry via the entry-context query.
 */
export const selectedTransactionVar = makeVar<StashedTransaction | null>(null);

/**
 * The stashed entry, but only when it is the one this route shows: the same
 * hash *in the same ledger*. A stash from another ledger with an equal hash
 * must not paint over (or stand in for) this ledger's entry.
 */
export function selectStashedTransaction(
  stash: StashedTransaction | null,
  route: { entryHash: string; ledgerId: string },
): JournalTransaction | null {
  if (
    !stash ||
    !route.entryHash ||
    stash.ledgerId !== route.ledgerId ||
    stash.entry.entry_hash !== route.entryHash
  ) {
    return null;
  }
  return stash.entry;
}

/**
 * Push the detail screen for `entry`, read from `ledgerId`. The `ledger` param
 * binds the history entry to that ledger, so a later ledger switch cannot
 * revive it under a different one (see `common/route-ledger`).
 */
export function openTransactionDetail(
  router: Router,
  entry: JournalTransaction,
  ledgerId: string,
  originAccount?: string,
  preview?: {
    selectedTransaction: ReactiveVar<StashedTransaction | null>;
  } | null,
): void {
  (preview?.selectedTransaction ?? selectedTransactionVar)({ ledgerId, entry });
  router.push({
    pathname: preview ? "/examples/transaction-detail" : "/transaction-detail",
    params: originAccount
      ? {
          entry_hash: entry.entry_hash,
          ledger: ledgerId,
          origin_account: originAccount,
        }
      : { entry_hash: entry.entry_hash, ledger: ledgerId },
  });
}
