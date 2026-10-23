import { useEffect, useMemo } from "react";
import { useReactiveVar } from "@apollo/client";
import { ledgerVar } from "@/common/vars";
import { useGetLedgerQuery } from "@/generated-graphql/graphql";
import { LedgerDrawer, type LedgerDrawerProps } from "./ledger-drawer";
import { useLedgerDirectory } from "@/common/ledger-directory/ledger-directory-provider";
import { getDrawerLedgers } from "./drawer-ledgers";
import { isLedgerGone } from "@/common/graphql-error-codes";
import { canonicalLedgerId } from "@/common/ledger-owner-rename";
import { renameLedger } from "@/common/vars/rename-ledger-owner";

/** Account queries live outside the shared drawer so a guest never mounts them. */
export function AccountLedgerDrawer(props: Omit<LedgerDrawerProps, "data">) {
  const { open } = props;
  const ledgerId = useReactiveVar(ledgerVar);
  const { ledgers, loading, error, refresh } = useLedgerDirectory();
  const listedCurrent = ledgers.find(
    (ledger) => ledger.id === ledgerId || ledger.fullName === ledgerId,
  );
  const { data: selectedData, error: selectedError } = useGetLedgerQuery({
    variables: { ledgerId: ledgerId ?? "" },
    skip: !open || !ledgerId || !!listedCurrent,
  });
  const selectedGone = isLedgerGone(selectedError);
  // A ledger renamed on the web answers under its new name: follow it, or
  // the drawer lists it twice, a "Current ledger" row under the old name
  // above the real one (w21/801).
  const renamedTo = canonicalLedgerId(ledgerId, selectedData?.getLedger);
  useEffect(() => {
    if (ledgerId && renamedTo && ledgerVar() === ledgerId) {
      renameLedger(ledgerId, renamedTo);
    }
  }, [ledgerId, renamedTo]);
  const selectedLedger = useMemo(
    () =>
      getDrawerLedgers([], ledgerId, selectedData?.getLedger, selectedGone)[0],
    [ledgerId, selectedData?.getLedger, selectedGone],
  );
  return (
    <LedgerDrawer
      {...props}
      data={{
        ledgerId,
        ledgers,
        selectedLedger,
        loading,
        error: Boolean(error),
        refetch: refresh,
        onSelect: (id) => ledgerVar(id),
      }}
    />
  );
}
