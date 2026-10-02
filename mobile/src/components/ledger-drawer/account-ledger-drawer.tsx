import { useMemo } from "react";
import { useReactiveVar } from "@apollo/client";
import { ledgerVar } from "@/common/vars";
import { useGetLedgerQuery } from "@/generated-graphql/graphql";
import { LedgerDrawer, type LedgerDrawerProps } from "./ledger-drawer";
import { useLedgerDirectory } from "@/common/ledger-directory/ledger-directory-provider";
import { getDrawerLedgers } from "./drawer-ledgers";

/** Account queries live outside the shared drawer so a guest never mounts them. */
export function AccountLedgerDrawer(props: Omit<LedgerDrawerProps, "data">) {
  const { open } = props;
  const ledgerId = useReactiveVar(ledgerVar);
  const { ledgers, loading, error, refresh } = useLedgerDirectory();
  const listedCurrent = ledgers.find(
    (ledger) => ledger.id === ledgerId || ledger.fullName === ledgerId,
  );
  const { data: selectedData } = useGetLedgerQuery({
    variables: { ledgerId: ledgerId ?? "" },
    skip: !open || !ledgerId || !!listedCurrent,
  });
  const selectedLedger = useMemo(
    () => getDrawerLedgers([], ledgerId, selectedData?.getLedger)[0],
    [ledgerId, selectedData?.getLedger],
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
