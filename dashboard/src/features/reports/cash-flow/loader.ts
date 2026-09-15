import type { RouteLoader } from "@/common/types/route-loader";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import { GetLedgerCashFlowDocument } from "@/graphql/definitions";
import { cashFlowQueryDefaults } from "./constants";
import { storedReportConversion } from "@/features/reports/components/use-report-conversion";

export const cashFlowLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/cash-flow",
  void,
  LedgerSearchParams
> = async ({ params, context, deps }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  // Settled, not awaited-to-throw: a rejection here (e.g. an invalid `filter`
  // search param) would escape to the route ErrorBoundary, which is keyed by
  // pathname only and therefore would not reset when the filter is corrected.
  // The page's own useQuery re-reports the same error through ReportErrorState,
  // which does recover on a search-param change. Matches the sibling report
  // loaders (trial-balance, balance-sheet, income-statement).
  await Promise.allSettled([
    context.client.query({
      query: GetLedgerCashFlowDocument,
      variables: {
        ledgerId,
        account: deps.account,
        filter: deps.filter,
        time: deps.time,
        interval: cashFlowQueryDefaults.interval,
        conversion: storedReportConversion(ledgerId),
      },
    }),
  ]);
};
