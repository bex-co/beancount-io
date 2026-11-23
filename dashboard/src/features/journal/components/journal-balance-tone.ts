import {
  isJournalBalance,
  type JournalDirectiveType,
} from "@/common/types/journal";

export type BalanceStatus = "off" | "matches" | "unchecked" | "unknown";

/** Only an explicit Open directive identifies an account the engine can check. */
export function getBalanceStatus(
  directive: JournalDirectiveType,
  openedAccounts?: ReadonlyMap<string, string>,
): BalanceStatus {
  if (!isJournalBalance(directive)) return "unknown";
  if (directive.diff_amount) return "off";
  if (!openedAccounts) return "unknown";
  const openedAt = openedAccounts.get(directive.account);
  return openedAt && openedAt <= directive.date ? "matches" : "unchecked";
}

export function balanceRowTone(status: BalanceStatus): string {
  if (status === "off")
    return "bg-rose-500/[0.07] hover:bg-rose-500/[0.1] dark:bg-rose-500/[0.12]";
  if (status === "matches")
    return "bg-emerald-500/[0.05] hover:bg-emerald-500/[0.08] dark:bg-emerald-500/[0.08]";
  return "hover:bg-muted/30";
}
