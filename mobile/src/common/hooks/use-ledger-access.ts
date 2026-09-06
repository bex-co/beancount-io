import { useReactiveVar } from "@apollo/client";
import { ledgerVar } from "@/common/vars";
import { useGetLedgerQuery } from "@/generated-graphql/graphql";
import { canWriteLedger } from "@/common/ledger-access";

export function useLedgerAccess() {
  const ledgerId = useReactiveVar(ledgerVar);
  const { data, error, loading, refetch } = useGetLedgerQuery({
    variables: { ledgerId: ledgerId ?? "" },
    skip: !ledgerId,
    fetchPolicy: "cache-and-network",
  });
  return {
    canWrite:
      !error &&
      data?.getLedger.id === ledgerId &&
      canWriteLedger(data?.getLedger.permissions),
    loading,
    error,
    refetch,
  };
}
