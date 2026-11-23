import { notFound } from "@tanstack/react-router";
import { rethrowEntityRouteError } from "@/common/lib/errors/entity-route-error";
import { accountReportPredicate } from "@/common/lib/navigation/account-report";
import type { RouteLoader } from "@/common/types/route-loader";
import { GetLedgerAccountsDocument } from "@/graphql/definitions";

export const accountLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
  { accountExists: true }
> = async ({ params, context, location }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  try {
    // Omitting status includes closed accounts and shares the sidebar cache.
    const { data } = await context.client.query({
      query: GetLedgerAccountsDocument,
      variables: { ledgerId },
      fetchPolicy: "cache-first",
    });
    const hasReport = accountReportPredicate(data?.getLedgerAccounts);
    if (!hasReport(params.accountName)) {
      throw notFound();
    }
    return { accountExists: true };
  } catch (error) {
    rethrowEntityRouteError(error, location);
  }
};
