import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { useMemo, type ReactNode } from "react";
import { Button } from "@/common/components/ui/button";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  AlertCircle,
  BarChart3,
  BookOpenText,
  FileUp,
  SearchCode,
} from "lucide-react";
import { useQuery } from "@apollo/client/react";
import {
  GetLedgerAccountMetaDocument,
  GetLedgerOverviewDocument,
} from "@/graphql/definitions";
import { toAccountMetaMap } from "@/features/reports/cash-flow/lib/model";
import { Link, useParams } from "@tanstack/react-router";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useLedger } from "@/common/hooks/use-ledger";
import { RelatedLinks } from "@/common/components/related-links";
import { ErrorBoundary } from "@/common/components/error-boundary";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import CashFlowSankey from "./components/cash-flow-sankey";
import { overviewQueryDefaults } from "./constants";
import { ReadmeCard } from "@/common/components/readme-card";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { getInvertIncomeLiabilitiesEquity } from "@/common/lib/fava-options";
import { StarButton } from "./components/star-button";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import { QuickAskInput } from "@/features/ai-agent/components/quick-ask-input";
import { IncomeExpensesChart } from "./components/income-expenses-chart";
import { DistributionChart } from "./components/distribution-chart";
import { LedgerWritePermission } from "@/common/components/ledger-permission/write";
import { NetWorthCard } from "./components/net-worth-card";
import { AccountBalancesCard } from "./components/account-balances-card";
import { MoneyMovementSection } from "./components/money-movement-section";
import { RecentActivityCard } from "./components/recent-activity-card";
import { DashboardCustomizer } from "./components/dashboard-customizer";
import {
  type DashboardWidgetId,
  useDashboardLayout,
} from "./hooks/use-dashboard-layout";
import { hasOverviewActivity } from "./lib/overview-utils";
import { EmptyLedgerSetup } from "./components/empty-ledger-setup";

/**
 * Overview page component
 * This page shows ledger overview information
 */
export default function LedgerOverviewPage() {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/",
  });

  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { layout, setVisible, move, reset } = useDashboardLayout(ledgerId);
  const ledgerFilters = useLedgerSearchParams();
  const { primaryCurrency, ledgerName: ledgerDisplayName } = useLedger();
  const { isAdmin, canWrite } = useLedgerPermission();

  const { ledgerData } = useLedger();
  const invertIncomeLiabilitiesEquity =
    getInvertIncomeLiabilitiesEquity(ledgerData);

  const {
    data,
    loading: isLoading,
    error,
  } = useQuery(GetLedgerOverviewDocument, {
    variables: {
      ledgerId: ledgerId,
      account: ledgerFilters.searchParams.account,
      filter: ledgerFilters.searchParams.filter,
      time: ledgerFilters.searchParams.time,
      ...overviewQueryDefaults,
    },
    fetchPolicy: "cache-first",
  });

  // Fetched apart from the overview query so a failure (or an older backend)
  // degrades the Sankey to heuristics instead of failing the page.
  const { data: metaData } = useQuery(GetLedgerAccountMetaDocument, {
    variables: { ledgerId },
    fetchPolicy: "cache-first",
  });
  const accountMeta = useMemo(
    () => toAccountMetaMap(metaData?.getLedgerAccountDirectives ?? []),
    [metaData],
  );

  if (isLoading && !data?.getLedgerOverview) {
    return (
      <div className="space-y-6 md:space-y-8">
        <Card>
          <CardContent>
            <div className="flex items-center justify-center py-14">
              <div className="text-center space-y-3">
                <div className="mx-auto h-8 w-8 rounded-full border-b-2 border-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  {t("page.overview.loading")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 md:space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 tracking-tight">
              <AlertCircle className="h-5 w-5" />
              {t("component.errorState.title")}
            </CardTitle>
            <CardDescription>{t("page.overview.failedToLoad")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {t(getErrorMessageKey(error))}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showStarButton = !isAdmin;
  const isStarred = ledgerData?.isStarred ?? false;
  const displayName = ledgerDisplayName ?? ledgerName;
  const overview = data?.getLedgerOverview;
  const hasActivity = hasOverviewActivity(overview);
  const widgets: Record<DashboardWidgetId, ReactNode> = {
    "financial-position": (
      <section
        aria-labelledby="overview-financial-position-heading"
        className="space-y-3"
      >
        <div>
          <h2
            id="overview-financial-position-heading"
            className="text-lg font-semibold tracking-tight"
          >
            {t("page.overview.financialPosition")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("page.overview.financialPositionDescription")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.8fr)]">
          <NetWorthCard
            data={overview?.netWorthData ?? []}
            primaryCurrency={primaryCurrency}
          />
          <AccountBalancesCard
            assets={overview?.assetsHierarchyData}
            liabilities={overview?.liabilitiesHierarchyData}
            primaryCurrency={primaryCurrency}
            invertLiabilities={invertIncomeLiabilitiesEquity}
            ledgerOwner={ledgerOwner}
            ledgerName={ledgerName}
          />
        </div>
      </section>
    ),
    "money-movement": (
      <MoneyMovementSection
        income={overview?.incomeIntervalData ?? []}
        expenses={overview?.expensesIntervalData ?? []}
        primaryCurrency={primaryCurrency}
        ledgerOwner={ledgerOwner}
        ledgerName={ledgerName}
      />
    ),
    "recent-activity": (
      <RecentActivityCard
        ledgerId={ledgerId}
        ledgerOwner={ledgerOwner}
        ledgerName={ledgerName}
        account={ledgerFilters.searchParams.account}
        filter={ledgerFilters.searchParams.filter}
        time={ledgerFilters.searchParams.time}
        primaryCurrency={primaryCurrency}
        incomeRoot={ledgerData.options.nameIncome}
        expensesRoot={ledgerData.options.nameExpenses}
        canWrite={canWrite}
      />
    ),
    "income-expenses": (
      <section
        aria-labelledby="overview-income-expenses-heading"
        className="space-y-3"
      >
        <h2
          id="overview-income-expenses-heading"
          className="text-lg font-semibold tracking-tight"
        >
          {t("page.reports.incomeVsExpenses")}
        </h2>
        <Card className="min-w-0 gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-5">
            <CardTitle>{t("page.reports.incomeVsExpenses")}</CardTitle>
            <CardDescription>
              {t("page.reports.incomeVsExpensesDescription")}
            </CardDescription>
            <CardAction>
              <span className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <BarChart3 className="size-4" />
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="px-3 py-4 sm:px-6 sm:py-5">
            <IncomeExpensesChart
              income={overview?.incomeIntervalData ?? []}
              expenses={overview?.expensesIntervalData ?? []}
            />
          </CardContent>
        </Card>
      </section>
    ),
    "balance-sheet": (
      <section
        aria-labelledby="overview-position-heading"
        className="space-y-3"
      >
        <h2
          id="overview-position-heading"
          className="text-lg font-semibold tracking-tight"
        >
          {t("common.balanceSheet")}
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DistributionChart
            title={t("page.overview.assetsDistribution")}
            description={t("page.overview.assetsDistributionDescription", {
              ledgerName: displayName,
            })}
            data={overview?.assetsHierarchyData}
          />
          <DistributionChart
            title={t("page.overview.liabilitiesDistribution")}
            description={t("page.overview.liabilitiesDistributionDescription", {
              ledgerName: displayName,
            })}
            data={overview?.liabilitiesHierarchyData}
            inverse
          />
        </div>
      </section>
    ),
    "cash-flow": (
      <section
        aria-labelledby="overview-cash-flow-heading"
        className="space-y-3"
      >
        <h2
          id="overview-cash-flow-heading"
          className="text-lg font-semibold tracking-tight"
        >
          {t("page.overview.cashFlow")}
        </h2>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{t("page.overview.cashFlow")}</CardTitle>
            <CardDescription>
              {t("page.overview.cashFlowDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CashFlowSankey
              incomeHierarchyData={overview?.incomeHierarchyData}
              expensesHierarchyData={overview?.expensesHierarchyData}
              assetsHierarchyData={overview?.assetsHierarchyData}
              liabilitiesHierarchyData={overview?.liabilitiesHierarchyData}
              accountMeta={accountMeta}
            />
          </CardContent>
        </Card>
      </section>
    ),
    readme: <ReadmeCard ledgerId={ledgerId} />,
  };

  const visibleWidgetIds = layout.order.filter(
    (id) => !layout.hidden.includes(id),
  );

  return (
    <div className="space-y-6 pb-4 md:space-y-8">
      <LedgerPageSEO seoKey="ledgerOverview" />

      <section className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="pointer-events-none absolute -top-32 -left-24 size-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-24 right-0 size-64 rounded-full bg-chart-4/10 blur-3xl" />
        <div className="relative p-4 sm:px-5 sm:py-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(16rem,1fr)_auto] xl:items-start">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
                  {t("common.overview")}
                </p>
                <h1 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">
                  {displayName}
                </h1>
                <p className="mt-1 max-w-2xl text-xs leading-snug text-muted-foreground sm:text-sm">
                  {t("common.pageDescription.overview", {
                    ledgerName: displayName,
                  })}
                </p>
              </div>
              {showStarButton && (
                <StarButton
                  ledgerId={ledgerId}
                  isStarred={isStarred}
                  className="shrink-0"
                  starLabel={t("page.overview.starButton.star")}
                  starredLabel={t("page.overview.starButton.starred")}
                />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 xl:max-w-[35rem] xl:justify-end">
              <Button asChild size="sm" className="rounded-full px-3">
                <Link
                  to="/ledger/$ledgerOwner/$ledgerName/income-statement"
                  params={{ ledgerOwner, ledgerName }}
                >
                  <BarChart3 />
                  {t("common.relatedLinks.incomeStatement")}
                </Link>
              </Button>
              <LedgerWritePermission>
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                  className="rounded-full px-3"
                >
                  <Link
                    to="/ledger/$ledgerOwner/$ledgerName/import"
                    params={{ ledgerOwner, ledgerName }}
                  >
                    <FileUp />
                    {t("common.relatedLinks.import")}
                  </Link>
                </Button>
              </LedgerWritePermission>
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="rounded-full px-3"
              >
                <Link
                  to="/ledger/$ledgerOwner/$ledgerName/query"
                  params={{ ledgerOwner, ledgerName }}
                >
                  <SearchCode />
                  {t("common.relatedLinks.query")}
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="rounded-full px-3"
              >
                <Link
                  to="/ledger/$ledgerOwner/$ledgerName/journal"
                  params={{ ledgerOwner, ledgerName }}
                >
                  <BookOpenText />
                  {t("common.relatedLinks.journal")}
                </Link>
              </Button>
              <DashboardCustomizer
                layout={layout}
                setVisible={setVisible}
                move={move}
                reset={reset}
              />
            </div>
          </div>

          <div className="mt-3 max-w-3xl">
            <QuickAskInput />
          </div>
        </div>
      </section>

      {!hasActivity ? (
        <EmptyLedgerSetup
          ledgerOwner={ledgerOwner}
          ledgerName={ledgerName}
          entryFile={
            ledgerData.bcioOptions.transactionFile ??
            ledgerData.bcioOptions.defaultFile
          }
          canWrite={canWrite}
        />
      ) : visibleWidgetIds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {t("page.overview.allWidgetsHidden")}
            </p>
            <DashboardCustomizer
              layout={layout}
              setVisible={setVisible}
              move={move}
              reset={reset}
            />
          </CardContent>
        </Card>
      ) : (
        visibleWidgetIds.map((id) => (
          <div key={id}>
            <ErrorBoundary>{widgets[id]}</ErrorBoundary>
          </div>
        ))
      )}

      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.journal"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/journal`,
          },
          {
            label: t("common.relatedLinks.balanceSheet"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/balance-sheet`,
          },
          {
            label: t("common.relatedLinks.incomeStatement"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/income-statement`,
          },
          {
            label: t("common.relatedLinks.cashFlow"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/cash-flow`,
          },
        ]}
      />
    </div>
  );
}
