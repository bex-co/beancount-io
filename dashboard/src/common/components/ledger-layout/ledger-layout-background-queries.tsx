import {
  ListLedgersDocument,
  GetLedgerAccountsDocument,
} from "@/graphql/definitions.ts";
import { Authenticated } from "../authenticated.tsx";
import { useQuery } from "@apollo/client/react";
import { memo } from "react";

interface LedgerLayoutBackgroundQueriesProps {
  /**
   * The ledger ID to prefetch accounts for
   */
  ledgerId: string;
}

/**
 * ListLedgersPrefetch Component
 *
 * Prefetches ListLedgers data used by LedgerSwitcher component
 * to improve UX by having data ready when popover is opened.
 *
 * Prefetching happens in the background and errors are silently handled
 * to prevent breaking the UI if prefetching fails.
 */
export function ListLedgersPrefetch() {
  useQuery(ListLedgersDocument);
  // This component doesn't render anything
  return null;
}

interface GetLedgerAccountsPrefetchProps {
  /**
   * The ledger ID to prefetch accounts for
   */
  ledgerId: string;
}

/**
 * GetLedgerAccountsPrefetch Component
 *
 * Prefetches GetLedgerAccounts data used by AccountCombobox component
 * to improve UX by having data ready when popover is opened.
 *
 * Prefetching happens in the background and errors are silently handled
 * to prevent breaking the UI if prefetching fails.
 *
 * @example
 * ```tsx
 * <GetLedgerAccountsPrefetch ledgerId={ledgerId} />
 * ```
 */
export function GetLedgerAccountsPrefetch({
  ledgerId,
}: GetLedgerAccountsPrefetchProps) {
  useQuery(GetLedgerAccountsDocument, {
    variables: { ledgerId },
  });
  // This component doesn't render anything
  return null;
}

/**
 * LedgerLayoutBackgroundQueries Component
 *
 * Fires background GraphQL queries to warm the Apollo cache for layout
 * components (LedgerSwitcher and AccountCombobox), so data is ready
 * when their popovers are opened.
 *
 * Queries run silently — errors are swallowed to avoid breaking the UI.
 *
 * @example
 * ```tsx
 * <LedgerLayoutBackgroundQueries ledgerId={ledgerId} />
 * ```
 */
export const LedgerLayoutBackgroundQueries = memo(
  function LedgerLayoutBackgroundQueries({
    ledgerId,
  }: LedgerLayoutBackgroundQueriesProps) {
    return (
      <>
        <Authenticated>
          <ListLedgersPrefetch />
        </Authenticated>
        <GetLedgerAccountsPrefetch ledgerId={ledgerId} />
      </>
    );
  },
);
