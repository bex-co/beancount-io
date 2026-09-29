import { useMemo } from "react";
import { useReactiveVar } from "@apollo/client";
import { ledgerVar } from "@/common/vars";
import {
  useGetLedgerQuery,
  useListLedgersQuery,
} from "@/generated-graphql/graphql";
import { LedgerDrawer, type LedgerDrawerProps } from "./ledger-drawer";
import { DRAWER_LEDGERS_PAGE_SIZE, getDrawerLedgers } from "./drawer-ledgers";

/** Account queries live outside the shared drawer so a guest never mounts them. */
export function AccountLedgerDrawer(props: Omit<LedgerDrawerProps, "data">) {
  const { open } = props;
  const ledgerId = useReactiveVar(ledgerVar);
  // Explicit pagination matching Browse page one: the server's no-argument
  // default silently drops ledgers Browse lists (w1/031).
  const { data, loading, error, refetch } = useListLedgersQuery({
    variables: { page: 1, limit: DRAWER_LEDGERS_PAGE_SIZE },
  });
  const ledgers = useMemo(() => data?.listLedgers ?? [], [data?.listLedgers]);
  const listedCurrent = ledgers.find(
    (ledger) => ledger.id === ledgerId || ledger.fullName === ledgerId,
  );
  const { data: selectedData } = useGetLedgerQuery({
    variables: { ledgerId: ledgerId ?? "" },
    skip: !open || !ledgerId || !!listedCurrent,
  });
  const drawerLedgers = useMemo(
    () => getDrawerLedgers(ledgers, ledgerId, selectedData?.getLedger),
    [ledgers, ledgerId, selectedData?.getLedger],
  );
  return (
    <LedgerDrawer
      {...props}
      data={{
        ledgerId,
        ledgers: drawerLedgers,
        loading,
        error: Boolean(error),
        refetch,
        onSelect: (id) => ledgerVar(id),
      }}
    />
  );
}
