import { useState, useCallback } from "react";
import {
  LedgerSearchParamsContext,
  type LedgerSearchParams,
} from "./context.ts";
import { getLedgerSearchParams } from "@/common/lib/ledger-search-params";

export const LedgerSearchParamsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // Initialize searchParams from URL search params (SSR-safe)
  const [searchParams, setSearchParams] = useState<LedgerSearchParams>(() =>
    getLedgerSearchParams(),
  );

  // Wrapper for setSearchParams that also updates URL
  const setSearchParamsWithUrlSync = useCallback(
    (newSearchParams: LedgerSearchParams) => {
      setSearchParams(newSearchParams);

      // Skip URL sync during SSR
      if (typeof window === "undefined") {
        return;
      }

      // Update URL search params using navigate
      const currentSearch = new URLSearchParams(window.location.search);

      // Update or remove account param
      if (newSearchParams.account) {
        currentSearch.set(
          "account",
          encodeURIComponent(newSearchParams.account),
        );
      } else {
        currentSearch.delete("account");
      }

      // Update or remove filter param
      if (newSearchParams.filter) {
        currentSearch.set("filter", encodeURIComponent(newSearchParams.filter));
      } else {
        currentSearch.delete("filter");
      }

      // Update or remove time param
      if (newSearchParams.time) {
        currentSearch.set("time", encodeURIComponent(newSearchParams.time));
      } else {
        currentSearch.delete("time");
      }

      // Navigate with updated search params
      const newSearch = currentSearch.toString();
      const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}`;

      // Use replace to avoid cluttering history
      window.history.replaceState({}, "", newUrl);
    },
    [],
  );

  return (
    <LedgerSearchParamsContext.Provider
      value={{ searchParams, setSearchParams: setSearchParamsWithUrlSync }}
    >
      {children}
    </LedgerSearchParamsContext.Provider>
  );
};
