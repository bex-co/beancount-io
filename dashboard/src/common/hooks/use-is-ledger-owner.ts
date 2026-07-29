import { useLedger } from "@/common/hooks/use-ledger";
import { useRootContext } from "@/common/hooks/use-root-context";

export function useIsLedgerOwner(): boolean {
  const { ledgerOwner } = useLedger();
  const { userProfile } = useRootContext();
  return userProfile?.username === ledgerOwner;
}
