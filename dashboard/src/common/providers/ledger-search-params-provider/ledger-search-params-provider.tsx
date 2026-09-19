import { useCallback, useMemo } from "react";
import { useMatch, useNavigate, useSearch } from "@tanstack/react-router";
import {
  LedgerSearchParamsContext,
  type LedgerSearchParams,
} from "./context.ts";
import {
  applyLedgerFilterSearch,
  parseLedgerFilterSearch,
} from "@/common/lib/ledger-search-params/parse";

/**
 * Shared ledger filters (account / filter / time) are owned by the router.
 * This provider mirrors validated search into the existing consumer API and
 * writes edits back with replace navigation so Back/Forward stay correct.
 */
export const LedgerSearchParamsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const rawSearch = useSearch({ strict: false });
  const navigate = useNavigate();
  const isJournal =
    useMatch({
      from: "/ledger/$ledgerOwner/$ledgerName/journal",
      shouldThrow: false,
      select: () => true,
    }) === true;

  const searchParams = useMemo(
    () => parseLedgerFilterSearch(rawSearch),
    [rawSearch],
  );

  const setSearchParams = useCallback(
    (next: LedgerSearchParams) => {
      void navigate({
        // Stay on the current matched route; only the shared filters change.
        to: ".",
        search: (prev) => {
          const updated = applyLedgerFilterSearch(
            prev as Record<string, unknown>,
            next,
          );
          const before = parseLedgerFilterSearch(prev);
          const after = parseLedgerFilterSearch(updated);
          if (
            isJournal &&
            (before.account !== after.account ||
              before.filter !== after.filter ||
              before.time !== after.time)
          ) {
            // Reset in this navigation: the pending layout can unmount Journal,
            // so the reset cannot depend on state inside that page.
            updated.offset = undefined;
          }
          return updated as typeof prev;
        },
        replace: true,
      });
    },
    [isJournal, navigate],
  );

  const value = useMemo(
    () => ({ searchParams, setSearchParams }),
    [searchParams, setSearchParams],
  );

  return (
    <LedgerSearchParamsContext.Provider value={value}>
      {children}
    </LedgerSearchParamsContext.Provider>
  );
};
