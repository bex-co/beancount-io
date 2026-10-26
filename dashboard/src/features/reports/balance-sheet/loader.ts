import type { RouteLoader } from "@/common/types/route-loader";
import type { ReportLoaderDeps } from "@/common/lib/navigation/report-interval";
import { GetLedgerBalanceSheetDocument } from "@/graphql/definitions";
import { storedReportConversion } from "@/features/reports/components/use-report-conversion";

export const balanceSheetLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/balance-sheet",
  void,
  ReportLoaderDeps
> = async ({ params, context, deps }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  await Promise.allSettled([
    context.client.query({
      query: GetLedgerBalanceSheetDocument,
      variables: {
        ledgerId,
        account: deps.account,
        filter: deps.filter,
        time: deps.time,
        interval: deps.interval,
        conversion: storedReportConversion(ledgerId),
      },
    }),
  ]);
};
