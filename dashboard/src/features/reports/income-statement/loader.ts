import type { RouteLoader } from "@/common/types/route-loader";
import type { ReportLoaderDeps } from "@/common/lib/navigation/report-interval";
import { GetLedgerIncomeStatementDocument } from "@/graphql/definitions";
import { storedReportConversion } from "@/features/reports/components/use-report-conversion";

export const incomeStatementLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/income-statement",
  void,
  ReportLoaderDeps
> = async ({ params, context, deps }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  await Promise.allSettled([
    context.client.query({
      query: GetLedgerIncomeStatementDocument,
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
