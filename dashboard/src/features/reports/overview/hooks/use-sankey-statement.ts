import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { GetLedgerCashFlowSankeyDocument } from "@/graphql/definitions";
import { mergeIntervalAccountChanges } from "@/features/reports/cash-flow/lib/merge-intervals";
import {
  buildCashFlowStatement,
  type AccountMetaMap,
  type CashFlowStatement,
} from "@/features/reports/cash-flow/lib/model";
import { isCurrencyConversion } from "@/common/lib/ledger-search-params/conversion";
import type { ConversionOption } from "@/common/types/chart";

export interface SankeyStatementState {
  /**
   * The period's cash-flow statement in the presentation currency, once the
   * interval totals have loaded. Undefined while pending and when the query
   * failed — the Sankey card then shows its empty state instead of failing
   * the whole overview page.
   */
  statement: CashFlowStatement | undefined;
  /** True while the flows are still loading with nothing cached. */
  pending: boolean;
}

interface LedgerFilterVariables {
  account?: string | null;
  filter?: string | null;
  time?: string | null;
}

/**
 * Period flows for the overview Sankey, as a cash-flow statement.
 *
 * Fetched apart from GetLedgerOverview on purpose: the overview route loader
 * has no `presentationCurrency` to pass as the conversion target, and keeping
 * this a client-side hook leaves the loader's SSR path untouched while
 * letting a failure degrade the Sankey card alone (same shape as
 * `useAccountMeta`).
 *
 * The statement is built with `closingCashAccounts: []` — the Sankey reads
 * only `rows` and `netChange`, so `opening`/`closing` are meaningless here and
 * `hasHeuristicCashAccounts` is always false. Nothing downstream reads them.
 */
export function useSankeyStatement(
  ledgerId: string,
  conversion: ConversionOption,
  presentationCurrency: string,
  filters: LedgerFilterVariables,
  accountMeta?: AccountMetaMap,
): SankeyStatementState {
  const targetCurrency = isCurrencyConversion(conversion)
    ? conversion
    : presentationCurrency;
  const { data, loading } = useQuery(GetLedgerCashFlowSankeyDocument, {
    variables: {
      ledgerId,
      conversion: targetCurrency,
      account: filters.account,
      filter: filters.filter,
      time: filters.time,
    },
    fetchPolicy: "cache-first",
  });

  const statement = useMemo(() => {
    if (!data) return undefined;
    // A partial response (one root errored, an older backend) must degrade
    // this card, not throw through the overview page that renders it.
    const intervals = mergeIntervalAccountChanges(
      data.incomeIntervals ?? [],
      data.expenseIntervals ?? [],
      data.assetIntervals ?? [],
      data.liabilityIntervals ?? [],
      data.equityIntervals ?? [],
    );
    return buildCashFlowStatement({
      intervals,
      closingCashAccounts: [],
      primaryCurrency: targetCurrency,
      accountMeta,
    });
  }, [data, targetCurrency, accountMeta]);

  return { statement, pending: loading && !data };
}
