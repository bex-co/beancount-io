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
  // Pages that keep a page offset in the URL. Their reset on a filter change
  // has to happen in this navigation, because the pending layout can unmount
  // the page and a reset owned by it would never run.
  const isJournal =
    useMatch({
      from: "/ledger/$ledgerOwner/$ledgerName/journal",
      shouldThrow: false,
      select: () => true,
    }) === true;
  const isAccountJournal =
    useMatch({
      from: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
      shouldThrow: false,
      select: () => true,
    }) === true;
  const isPaginatedList = isJournal || isAccountJournal;

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
            isPaginatedList &&
            (before.account !== after.account ||
              before.filter !== after.filter ||
              before.time !== after.time)
          ) {
            updated.offset = undefined;
          }
          return updated as typeof prev;
        },
        replace: true,
      });
    },
    [isPaginatedList, navigate],
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
