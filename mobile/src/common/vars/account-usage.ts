import { createPersistentVar } from "@/common/apollo/persistent-var";
import {
  recordUsage,
  type LedgerAccountUsage,
} from "@/common/account-frecency";

/**
 * Which accounts the user actually books against, per ledger — the input to the
 * picker's Recent section and its search tiebreak.
 *
 * Persisted like the other preference vars, so a recent account is still recent
 * after the app is killed. Keyed by ledger because a chart of accounts is a
 * property of the ledger: switching ledgers must not carry habits across.
 */
export const [accountUsageVar, loadAccountUsage] =
  createPersistentVar<LedgerAccountUsage>("accountUsage", {});

/** Record one pick of `account` on `ledgerId`, made at `now` (epoch ms). */
export function recordAccountUsage(
  ledgerId: string,
  account: string,
  now: number,
): void {
  accountUsageVar(recordUsage(accountUsageVar(), ledgerId, account, now));
}
