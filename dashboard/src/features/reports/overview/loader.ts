import type { RouteLoader } from "@/common/types/route-loader";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import { prefetchOptionalQuery } from "@/common/apollo/prefetch";
import {
  GetLedgerAccountMetaDocument,
  GetLedgerDocument,
  GetLedgerFileDocument,
  GetLedgerJournalDocument,
  GetLedgerOverviewDocument,
  GetLedgerOverviewValuationDocument,
} from "@/graphql/definitions";
import { overviewQueryDefaults } from "./constants";
import { loadPublicReadme } from "./load-public-readme";
import { recentTransactionsVariables } from "./lib/recent-transactions";
import {
  dataThroughOf,
  financialPositionPeriod,
  openingMonth,
} from "./lib/overview-month";
import { getIntervalDates, toLocalISODate } from "./lib/overview-utils";
import type { InitialLedgerReadme } from "@/common/lib/ledger-readme";

export const overviewLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/",
  { readme?: InitialLedgerReadme },
  LedgerSearchParams & { month?: string }
> = async ({ params, context, deps, abortController }) => {
  const ledgerId = `${params.ledgerOwner}/${params.ledgerName}`;
  const { account, filter, time, month: requestedMonth } = deps;
  const today = toLocalISODate(new Date());

  // Client navigation keeps optional panels nonblocking. Initial public SSR
  // additionally settles README within a deadline so its authored explanation
  // can be read without JavaScript, using the same first-render snapshot.
  const readme = import.meta.env.SSR
    ? loadPublicReadme(context.client, ledgerId, abortController.signal)
    : Promise.resolve(undefined);
  prefetchOptionalQuery(context.client, {
    query: GetLedgerFileDocument,
    variables: { ledgerId, path: "README.md" },
  });
  prefetchOptionalQuery(context.client, {
    query: GetLedgerAccountMetaDocument,
    variables: { ledgerId },
  });

  // Three reads are primary content: the flows at cost, the balances at
  // market value, and the newest transactions. Awaiting the first two means a
  // server render already has the market figures, so nothing is drawn at cost
  // and then replaced; the third says where the ledger's data ends, which
  // picks the month the page opens on, so that month never changes under the
  // reader. The page renders its own error states from these same queries, so
  // a failure here must not become a route error.
  const overview = context.client
    .query({
      query: GetLedgerOverviewDocument,
      variables: {
        ledgerId,
        account,
        filter,
        time,
        interval: overviewQueryDefaults.interval,
        conversion: overviewQueryDefaults.conversion,
      },
    })
    .catch(() => undefined);
  const market = context.client
    .query({
      query: GetLedgerOverviewValuationDocument,
      variables: {
        ledgerId,
        account,
        filter,
        time,
        interval: overviewQueryDefaults.interval,
      },
    })
    .catch(() => undefined);
  const journal = context.client
    .query({
      query: GetLedgerJournalDocument,
      variables: recentTransactionsVariables({
        ledgerId,
        account,
        filter,
        time,
        today,
      }),
    })
    .catch(() => undefined);
  // Prefetch the scoped balance through the selected month or today's close.
  // These rows are primary content and must be present on the server render.
  const monthBalances = Promise.all([overview, journal]).then(
    async ([flows, newest]) => {
      const income = flows?.data?.getLedgerOverview?.incomeIntervalData ?? [];
      const expenses =
        flows?.data?.getLedgerOverview?.expensesIntervalData ?? [];
      if (income.length === 0 && expenses.length === 0) return;
      // Who is reading decides the month as the page does: a public reader
      // opens on the latest month with activity. The parent loader has
      // already asked, so this is its cached answer.
      const ledger = await context.client
        .query({ query: GetLedgerDocument, variables: { ledgerId } })
        .catch(() => undefined);
      const about = ledger?.data?.getLedger;
      const permissions = about?.permissions;
      const dataThrough = dataThroughOf(
        newest?.data?.getLedgerJournal?.data,
        today,
      );
      const dates = getIntervalDates(income, expenses);
      const month = openingMonth({
        income,
        expenses,
        preferActiveMonth:
          about?.private === false &&
          permissions?.push !== true &&
          permissions?.admin !== true,
        hasFilters: Boolean(account || filter || time),
        dataThrough,
        today,
        dates,
        month: requestedMonth,
      });
      const positionPeriod = financialPositionPeriod({
        selectedDate: month,
        latestDate: dates.at(-1),
        dataThrough,
        today,
        time,
        fiscalYearEnd: about?.favaOptions?.fiscalYearEnd,
      });
      if (!positionPeriod || positionPeriod.time === time) return;
      // The variables the page's own month read uses, so it is a cache hit.
      await context.client
        .query({
          query: GetLedgerOverviewValuationDocument,
          variables: {
            ledgerId,
            account,
            filter,
            time: positionPeriod.time,
            interval: overviewQueryDefaults.interval,
          },
        })
        .catch(() => undefined);
    },
  );
  await Promise.all([overview, market, journal, monthBalances]);
  return { readme: await readme };
};
