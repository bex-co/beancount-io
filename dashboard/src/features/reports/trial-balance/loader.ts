import type { RouteLoader } from "@/common/types/route-loader";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import { GetLedgerTrialBalanceDocument } from "@/graphql/definitions";
import { storedReportConversion } from "@/features/reports/components/use-report-conversion";

export const trialBalanceLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/trial-balance",
  void,
  LedgerSearchParams
> = async ({ params, context, deps }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  const conversion = storedReportConversion(ledgerId);
  const conversions =
    conversion === "at_cost" ? [conversion] : [conversion, "at_cost"];
  await Promise.allSettled(
    conversions.map((conversion) =>
      context.client.query({
        query: GetLedgerTrialBalanceDocument,
        variables: {
          ledgerId,
          account: deps.account,
          filter: deps.filter,
          time: deps.time,
          conversion,
        },
      }),
    ),
  );
};
