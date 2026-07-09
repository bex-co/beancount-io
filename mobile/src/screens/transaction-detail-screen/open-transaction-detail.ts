import { makeVar } from "@apollo/client";
import type { useRouter } from "expo-router";
import { analytics } from "@/common/analytics";
import type { JournalTransaction } from "@/screens/journal-screen/types";

type Router = ReturnType<typeof useRouter>;

/**
 * Last tapped transaction, stashed so the detail screen paints instantly.
 * The entry_hash route param stays the source of truth — when the var is
 * empty or stale (deep link, remount) the screen falls back to fetching the
 * entry via the entry-context query.
 */
export const selectedTransactionVar = makeVar<JournalTransaction | null>(null);

export type TransactionDetailSource = "home" | "journal" | "account_detail";

export function openTransactionDetail(
  router: Router,
  entry: JournalTransaction,
  source: TransactionDetailSource,
  originAccount?: string,
): void {
  analytics.track("open_transaction_detail", { source });
  selectedTransactionVar(entry);
  router.push({
    pathname: "/transaction-detail",
    params: originAccount
      ? { entry_hash: entry.entry_hash, origin_account: originAccount }
      : { entry_hash: entry.entry_hash },
  });
}
