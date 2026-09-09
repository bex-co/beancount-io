import { useCallback } from "react";
import { useLedger } from "./use-ledger";
import { useNavigate } from "@tanstack/react-router";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import { toLedgerFilterSearchParam } from "@/common/lib/ledger-search-params";

/**
 * Navigate to an account journal. Optional `search` overrides merge into the
 * current route search (e.g. Overview money-movement can pass a month). Omit
 * overrides to keep existing shared filters via retainSearchParams — Account
 * balances must not invent a month of its own.
 */
export const useLedgerNavigateToAccount = () => {
  const { ledgerOwner, ledgerName } = useLedger();
  const navigate = useNavigate();
  const navigateToAccount = useCallback(
    (account: string, search?: Partial<LedgerSearchParams>) => {
      void navigate({
        to: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
        params: {
          ledgerOwner: ledgerOwner,
          ledgerName: ledgerName,
          accountName: account,
        },
        search: (prev) => {
          if (!search) {
            return prev;
          }
          const next = { ...prev } as Record<string, unknown>;
          if (search.account !== undefined) {
            next.account = search.account || undefined;
          }
          if (search.filter !== undefined) {
            next.filter = search.filter || undefined;
          }
          if (search.time !== undefined) {
            next.time = toLedgerFilterSearchParam(search.time);
          }
          return next as typeof prev;
        },
      });
    },
    [ledgerOwner, ledgerName, navigate],
  );
  return navigateToAccount;
};
