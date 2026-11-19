import type { JournalBalance } from "@/common/types/journal";

/**
 * A balance assertion is a reconciliation checkpoint: the ledger's balance
 * for the account on that day either matches what the statement said, or it
 * is off by `diff_amount`. Everything between two matching checkpoints is
 * reconciled.
 */
export function balanceIsOff(directive: JournalBalance): boolean {
  return Boolean(directive.diff_amount);
}

/** The row's tint: a quiet green when it matches, red when it is off. */
export function balanceRowTone(directive: JournalBalance): string {
  return balanceIsOff(directive)
    ? "bg-rose-500/[0.07] hover:bg-rose-500/[0.1] dark:bg-rose-500/[0.12]"
    : "bg-emerald-500/[0.05] hover:bg-emerald-500/[0.08] dark:bg-emerald-500/[0.08]";
}
