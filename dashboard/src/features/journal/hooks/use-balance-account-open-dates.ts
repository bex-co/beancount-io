import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { useHydrated } from "@tanstack/react-router";
import { GetLedgerAccountDirectivesDocument } from "@/graphql/definitions";

/** Open directives are needed only for assertions without an engine diff. */
export function useBalanceAccountOpenDates(ledgerId: string) {
  const hydrated = useHydrated();
  const { data, error } = useQuery(GetLedgerAccountDirectivesDocument, {
    variables: { ledgerId },
    skip: !hydrated,
    fetchPolicy: "cache-first",
  });
  const accounts =
    hydrated && !error ? data?.getLedgerAccountDirectives : undefined;
  return useMemo(() => {
    if (!accounts) return undefined;
    const openedAccounts = new Map<string, string>();
    for (const { account, openedAt } of accounts) {
      const firstOpen = openedAccounts.get(account);
      if (!firstOpen || openedAt < firstOpen) {
        openedAccounts.set(account, openedAt);
      }
    }
    return openedAccounts;
  }, [accounts]);
}
