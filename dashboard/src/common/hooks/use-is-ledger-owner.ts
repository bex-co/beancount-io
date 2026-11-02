import { useLedger } from "@/common/hooks/use-ledger";
import { useRootContext } from "@/common/hooks/use-root-context";

/** Whether `username` owns a ledger owned by `ledgerOwner`. Usernames ignore case. */
export const isLedgerOwnerName = (
  ledgerOwner: string | undefined,
  username: string | null | undefined,
): boolean =>
  Boolean(ledgerOwner && username) &&
  ledgerOwner?.toLowerCase() === username?.toLowerCase();

export function useIsLedgerOwner(): boolean {
  const { ledgerOwner } = useLedger();
  const { userProfile } = useRootContext();
  return isLedgerOwnerName(ledgerOwner, userProfile?.username);
}
