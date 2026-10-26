import type { RouteLoader } from "@/common/types/route-loader";
import type { ReportLoaderDeps } from "@/common/lib/navigation/report-interval";
import {
  GetLedgerCashFlowAccountsDocument,
  GetLedgerCashFlowDocument,
  GetLedgerDocument,
} from "@/graphql/definitions";
import { cashFlowRootVariables, ledgerAccountRoots } from "./lib/account-roots";
import { cashActivityFilter } from "./lib/cash-eligibility";
import { cashAccountMembership, toAccountMetaMap } from "./lib/model";
import { storedReportConversion } from "@/features/reports/components/use-report-conversion";

export const cashFlowLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/cash-flow",
  void,
  ReportLoaderDeps
> = async ({ params, context, deps }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  // Settled, not awaited-to-throw: a rejection here (e.g. an invalid `filter`
  // search param) would escape to the route ErrorBoundary, which is keyed by
  // pathname only and therefore would not reset when the filter is corrected.
  // The page's own useQuery re-reports the same error through ReportErrorState,
  // which does recover on a search-param change. Matches the sibling report
  // loaders (trial-balance, balance-sheet, income-statement).
  // The interval reads take the ledger's own root names, as the page does;
  // the ledger read is the layout's, normally already cached.
  const [ledger, accounts] = await Promise.all([
    context.client
      .query({ query: GetLedgerDocument, variables: { ledgerId } })
      .catch(() => null),
    // Cash membership, as the page resolves it (w4/m56). Without it the page
    // has no activity read to make, so neither does the loader.
    context.client
      .query({
        query: GetLedgerCashFlowAccountsDocument,
        variables: { ledgerId },
      })
      .catch(() => null),
  ]);
  const directives = accounts?.data?.getLedgerAccountDirectives;
  if (!directives) return;
  const options = ledger?.data?.getLedger?.options;
  await Promise.allSettled([
    context.client.query({
      query: GetLedgerCashFlowDocument,
      variables: {
        ledgerId,
        account: deps.account,
        filter: deps.filter,
        activityFilter: cashActivityFilter(
          deps.filter,
          cashAccountMembership(
            toAccountMetaMap(directives),
            ledgerAccountRoots(options),
          ),
        ),
        time: deps.time,
        interval: deps.interval,
        conversion: storedReportConversion(ledgerId),
        ...cashFlowRootVariables(options),
      },
    }),
  ]);
};
