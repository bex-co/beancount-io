import { useCallback, useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
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

  const searchParams = useMemo(
    () => parseLedgerFilterSearch(rawSearch),
    [rawSearch],
  );

  const setSearchParams = useCallback(
    (next: LedgerSearchParams) => {
      void navigate({
        // Stay on the current matched route; only the shared filters change.
        to: ".",
        search: (prev) =>
          applyLedgerFilterSearch(
            prev as Record<string, unknown>,
            next,
          ) as typeof prev,
        replace: true,
      });
    },
    [navigate],
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
