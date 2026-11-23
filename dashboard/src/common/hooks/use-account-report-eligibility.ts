import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { GetLedgerAccountsDocument } from "@/graphql/definitions";
import { accountReportPredicate } from "@/common/lib/navigation/account-report";

export function useAccountReportEligibility(ledgerId: string) {
  // Omit status and report filters so this shares the sidebar and loader cache.
  const { data } = useQuery(GetLedgerAccountsDocument, {
    variables: { ledgerId },
    fetchPolicy: "cache-first",
    skip: !ledgerId,
  });
  const accounts = data?.getLedgerAccounts;
  return useMemo(() => accountReportPredicate(accounts), [accounts]);
}
