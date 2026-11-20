import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { LedgerPage } from "@/common/components/ledger-page";
import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Button } from "@/common/components/ui/button";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  FileUp,
  Filter,
} from "lucide-react";
import { formatLedgerDate } from "@/common/lib/format/ledger-date";
import { useQuery } from "@apollo/client/react";
import {
  GetLedgerOverviewDocument,
  GetLedgerOverviewValuationDocument,
} from "@/graphql/definitions";
import { Link, useLoaderData, useParams } from "@tanstack/react-router";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useLedger } from "@/common/hooks/use-ledger";
import { RelatedLinks } from "@/common/components/related-links";
import { ErrorBoundary } from "@/common/components/error-boundary";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { overviewQueryDefaults } from "./constants";
import { ReadmeCard } from "@/common/components/readme-card";
import { useLedgerReadme } from "@/common/hooks/use-ledger-readme";
import type { InitialLedgerReadme } from "@/common/lib/ledger-readme";
import { resolveLedgerPresentation } from "@/common/lib/seo/ledger-presentation";
import { getInvertIncomeLiabilitiesEquity } from "@/common/lib/fava-options";
import { StarButton } from "./components/star-button";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import { QuickAskInput } from "@/features/ai-agent/components/quick-ask-input";
import { LedgerWritePermission } from "@/common/components/ledger-permission/write";
import { NetWorthCard } from "./components/net-worth-card";
import { AccountBalancesCard } from "./components/account-balances-card";
import { MoneyMovementSection } from "./components/money-movement-section";
import { RecentActivityCard } from "./components/recent-activity-card";
import {
  CustomizeButton,
  DashboardCustomizer,
} from "./components/dashboard-customizer";
import {
  type DashboardWidgetId,
  useDashboardLayout,
} from "./hooks/use-dashboard-layout";
import { useAccountMeta } from "./hooks/use-account-meta";
import { ReportEmptyState } from "@/common/components/state-components";
import { hasOverviewActivity, toLocalISODate } from "./lib/overview-utils";
import {
  describeLatestNetWorth,
  throughCurrentMonth,
} from "./lib/net-worth-valuation";
import { EmptyLedgerSetup } from "./components/empty-ledger-setup";
import { MonthSummary } from "./components/month-summary";
import { MonthCashFlow } from "./components/month-cash-flow";
import { useDataThrough, useOverviewMonth } from "./hooks/use-overview-month";
import { isPastMonth } from "./lib/overview-month";

function PublicLedgerIntroduction({
  ledgerId,
  initialReadme,
  name,
  description,
  readmeVisible,
}: {
  ledgerId: string;
  initialReadme?: InitialLedgerReadme;
  name: string;
  description?: string | null;
  readmeVisible: boolean;
}) {
  const { t } = useTranslations();
  const { content } = useLedgerReadme(ledgerId, initialReadme);
  const presentation = resolveLedgerPresentation({
    name,
    description,
    readme: content,
    fallbackDescription: t("common.pageDescription.overview", {
      ledgerName: name,
    }),
  });
  return (
    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
      {presentation.description}
      {readmeVisible && content && (
        <>
          {" "}
          <a
            href="#overview-ledger-notes"
            className="whitespace-nowrap text-foreground underline underline-offset-4"
          >
            {t("page.overview.ledgerNotes")}
          </a>
        </>
      )}
    </p>
  );
}

/**
 * One heading per section, and no sentence under it explaining what the
 * section is: the content says that. A card inside a section does not repeat
 * the heading either.
 */
function SectionHeading({
  id,
  title,
  meta,
}: {
  id: string;
  title: string;
  /** What the section is as of, quieter beside its title. */
  meta?: string;
}) {
  return (
    <h2
      id={id}
      className="flex flex-wrap items-baseline gap-x-2 text-xl font-semibold tracking-tight"
    >
      {title}
      {meta && (
        <span className="text-base font-normal tracking-normal text-muted-foreground tabular-nums">
          {meta}
        </span>
      )}
    </h2>
  );
}

/** Sections rise in one after another, unless the reader asked for less motion. */
const SECTION_ENTRANCE =
  "animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none";
const sectionDelay = (index: number) =>
  ({
    "--tw-animation-delay": `${Math.min(index, 6) * 70}ms`,
    "--tw-animation-fill-mode": "both",
  }) as CSSProperties;

const NO_INTERVALS: never[] = [];

/**
 * Overview page component
 * This page shows ledger overview information
 */
export default function LedgerOverviewPage() {
  const { t, i18n } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/",
  });
  const loaderData = useLoaderData({
    from: "/ledger/$ledgerOwner/$ledgerName/",
  });
  const initialReadme = loaderData?.readme;

  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const {
    primaryCurrency,
    ledgerName: ledgerDisplayName,
    ledgerData,
  } = useLedger();
  const { isAdmin, canWrite } = useLedgerPermission();
  const publicReader = !ledgerData.private && !canWrite;
  const { layout, setVisible, move, reset } = useDashboardLayout(ledgerId);
  // One customization panel for both entry points; see DashboardCustomizer.
  const [customizing, setCustomizing] = useState(false);
  const customizeOpener = useRef<HTMLElement | null>(null);
  const overviewHeading = useRef<HTMLHeadingElement>(null);
  const ledgerFilters = useLedgerSearchParams();
  const invertIncomeLiabilitiesEquity =
    getInvertIncomeLiabilitiesEquity(ledgerData);

  // Flows (money movement, income vs expenses, cash flow) at cost.
  const {
    data,
    loading: overviewLoading,
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
  // Balances (net worth, account balances, distribution) at market value.
  const {
    data: valuationData,
    loading: valuationLoading,
    error: valuationError,
  } = useQuery(GetLedgerOverviewValuationDocument, {
    variables: {
      ledgerId: ledgerId,
      account: ledgerFilters.searchParams.account,
      filter: ledgerFilters.searchParams.filter,
      time: ledgerFilters.searchParams.time,
      interval: overviewQueryDefaults.interval,
    },
    fetchPolicy: "cache-first",
  });

  const { accountMeta, pending: accountMetaPending } = useAccountMeta(ledgerId);

  const today = toLocalISODate(new Date());
  const dataThrough = useDataThrough({
    ledgerId,
    account: ledgerFilters.searchParams.account,
    filter: ledgerFilters.searchParams.filter,
    time: ledgerFilters.searchParams.time,
    today,
  });
  // Dormancy is a fact about the ledger, not the view: a past Time filter
  // always ends long ago, so the "Last entry" line reads the newest
  // transaction with no filter (w5/1149). Everything else keeps the
  // filtered date above.
  const ledgerDataThrough = useDataThrough({
    ledgerId,
    account: "",
    filter: "",
    time: "",
    today,
  });
  // One month for the whole page: the summary, the money cards, their
  // history and the cash-flow diagram all answer for it.
  const month = useOverviewMonth({
    income: data?.getLedgerOverview?.incomeIntervalData ?? NO_INTERVALS,
    expenses: data?.getLedgerOverview?.expensesIntervalData ?? NO_INTERVALS,
    preferActiveMonth: publicReader,
    dataThrough,
    today,
  });
  // A month before the one the data ends in is history: the balances are
  // read again at its close, so Financial position answers for the same month
  // as the summary above it. The running (or last) month uses the page's own
  // read.
  const pastMonth = isPastMonth(month.selectedDate, dataThrough);
  const monthValuation = useQuery(GetLedgerOverviewValuationDocument, {
    variables: {
      ledgerId,
      account: ledgerFilters.searchParams.account,
      filter: ledgerFilters.searchParams.filter,
      time: month.timeFilter,
      interval: overviewQueryDefaults.interval,
    },
    skip: !pastMonth || !month.timeFilter,
    fetchPolicy: "cache-first",
  });
  const market = valuationData?.market;
  const costNetWorth = data?.getLedgerOverview?.netWorthData;
  const netWorthValuation = useMemo(
    () =>
      describeLatestNetWorth({
        market: market?.netWorthData ?? [],
        cost: costNetWorth ?? [],
        units: valuationData?.held?.netWorthData ?? [],
        currency: primaryCurrency,
        today,
        pricePairs: valuationData?.getLedgerCommodities ?? [],
        managedSources: valuationData?.getLedgerManagedPrices ?? [],
      }),
    [market, costNetWorth, valuationData, primaryCurrency, today],
  );

  // Do not keep a prior period's overview cards while a replacement read is in
  // flight — the URL/filters already name the new scope. Both reads gate the
  // page, so a balance is never drawn at cost and then redrawn at market.
  let reportState: ReactNode;
  if (overviewLoading || valuationLoading) {
    reportState = (
      <div className="space-y-6 md:space-y-8">
        <Card>
          <CardContent>
            <div
              className="flex items-center justify-center py-14"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
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
  } else if (error) {
    reportState = (
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

  // Public explanations remain usable while reports fail or have no matching
  // activity. Writers retain the existing report loading/error experience.
  if (reportState && !publicReader) return reportState;

  const showStarButton = !isAdmin;
  const isStarred = ledgerData?.isStarred ?? false;
  const displayName = publicReader
    ? resolveLedgerPresentation({
        name: ledgerData.name ?? ledgerDisplayName ?? ledgerName,
        title: ledgerData.options.title,
        fallbackDescription: "",
      }).title
    : (ledgerDisplayName ?? ledgerName);
  const overview = data?.getLedgerOverview;
  const hasActivity = hasOverviewActivity(overview);
  const hasActiveFilters = Boolean(
    ledgerFilters.searchParams.account ||
    ledgerFilters.searchParams.filter ||
    ledgerFilters.searchParams.time,
  );
  // The flows still load without the market read; the balance modules say
  // they could not, rather than fall back to a figure at cost.
  const balancesError = valuationError ? (
    <Alert variant="destructive">
      <AlertDescription>
        {t(getErrorMessageKey(valuationError))}
      </AlertDescription>
    </Alert>
  ) : null;
  // The one thing on the page that asks the writer to act: holdings valued
  // at prices that stopped updating. Said once, beside the balances it
  // affects, with the way to fix it; the Net Worth card keeps the per-holding
  // detail. A note, not a banner: it qualifies figures, it does not lead.
  const staleSince = netWorthValuation?.staleSince ?? null;
  const staleNoticeShown =
    canWrite &&
    !reportState &&
    hasActivity &&
    staleSince !== null &&
    // It is about today's prices: a past month's close is not valued at them.
    !pastMonth &&
    !layout.hidden.includes("financial-position");
  const staleNotice = staleNoticeShown ? (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <AlertTriangle
        aria-hidden="true"
        className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
      />
      <p className="min-w-0">
        {t("page.overview.pricesNotUpdated", {
          date:
            formatLedgerDate(staleSince, i18n.language, {
              dateStyle: "medium",
            }) ?? staleSince,
          count:
            netWorthValuation?.holdings.filter((holding) => holding.stale)
              .length ?? 0,
        })}
      </p>
      <Link
        to="/ledger/$ledgerOwner/$ledgerName/commodities"
        params={{ ledgerOwner, ledgerName }}
        className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
      >
        {t("page.overview.updatePrices")}
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </div>
  ) : null;

  // The month's summary and its chart lead the page whenever there is a
  // month to show.
  const heroShown = !reportState && hasActivity && month.selectedDate !== "";
  // The day Financial position answers for: the month's close, or the
  // ledger's last day with data.
  const positionDate = pastMonth
    ? month.selectedDate
    : [
        throughCurrentMonth(market?.netWorthData ?? [], today).at(-1)?.date,
        dataThrough,
      ]
        .filter((date): date is string => Boolean(date))
        .sort()[0];
  const netWorth = (trend: boolean) => (
    <NetWorthCard
      data={market?.netWorthData ?? []}
      valuation={netWorthValuation}
      primaryCurrency={primaryCurrency}
      ledgerOwner={ledgerOwner}
      ledgerName={ledgerName}
      today={today}
      selectedDate={month.selectedDate || undefined}
      dataThrough={dataThrough}
      staleNoticeShown={staleNoticeShown}
      // Without a trend the page's hero chart draws the line (and lists the
      // months), and the figure heads the Accounts card.
      trend={trend}
    />
  );
  const monthBalancesFailed = Boolean(pastMonth && monthValuation.error);
  const monthBalancesAlert = monthValuation.error ? (
    <Alert variant="destructive">
      <AlertDescription>
        {t(getErrorMessageKey(monthValuation.error))}
      </AlertDescription>
    </Alert>
  ) : null;
  const accountBalances = (summary: ReactNode | undefined) => (
    <AccountBalancesCard
      summary={summary}
      assets={
        pastMonth
          ? monthValuation.data?.market?.assetsHierarchyData
          : market?.assetsHierarchyData
      }
      liabilities={
        pastMonth
          ? monthValuation.data?.market?.liabilitiesHierarchyData
          : market?.liabilitiesHierarchyData
      }
      primaryCurrency={primaryCurrency}
      invertLiabilities={invertIncomeLiabilitiesEquity}
      ledgerOwner={ledgerOwner}
      ledgerName={ledgerName}
      time={pastMonth ? month.timeFilter : ledgerFilters.searchParams.time}
      fiscalYearEnd={ledgerData.favaOptions?.fiscalYearEnd}
      // The same day the Net Worth card names.
      asOf={positionDate}
      pending={pastMonth && !monthValuation.data}
    />
  );
  const widgets: Record<DashboardWidgetId, ReactNode> = {
    "financial-position": (
      <section
        aria-labelledby="overview-financial-position-heading"
        className="space-y-3"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <SectionHeading
            id="overview-financial-position-heading"
            title={t("page.overview.financialPosition")}
            // One card answers for one day, so the section names it once.
            meta={
              heroShown && positionDate
                ? (formatLedgerDate(positionDate, i18n.language, {
                    dateStyle: "medium",
                  }) ?? positionDate)
                : undefined
            }
          />
          {staleNotice}
        </div>
        {balancesError ??
          (heroShown ? (
            // A size container: the card lays its sides out by the width
            // the section has, which a sidebar narrows. The figure heads the
            // card that lists what it adds up.
            <div className="@container grid gap-4">
              {monthBalancesFailed ? (
                <>
                  <Card className="gap-0 px-5 py-5">{netWorth(false)}</Card>
                  {monthBalancesAlert}
                </>
              ) : (
                accountBalances(netWorth(false))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(19rem,0.8fr)]">
              {netWorth(true)}
              {monthBalancesFailed
                ? monthBalancesAlert
                : accountBalances(undefined)}
            </div>
          ))}
      </section>
    ),
    "money-movement": (
      <MoneyMovementSection
        income={overview?.incomeIntervalData ?? []}
        expenses={overview?.expensesIntervalData ?? []}
        primaryCurrency={primaryCurrency}
        ledgerOwner={ledgerOwner}
        ledgerName={ledgerName}
        dates={month.dates}
        selectedDate={month.selectedDate}
        onSelectDate={month.setSelectedDate}
        timeFilter={month.timeFilter}
        dataThrough={dataThrough}
        history={!heroShown}
        flow={
          <MonthCashFlow
            ledgerId={ledgerId}
            account={ledgerFilters.searchParams.account}
            filter={ledgerFilters.searchParams.filter}
            time={month.timeFilter}
            accountMeta={accountMeta}
            primaryCurrency={primaryCurrency}
            accountMetaPending={accountMetaPending}
          />
        }
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
    readme: (
      <div id="overview-ledger-notes" className="scroll-mt-4">
        <ReadmeCard
          ledgerId={ledgerId}
          initialReadme={initialReadme}
          headingOffset={1}
          // A writer's notes follow the figures, as a preview to read on
          // from; a public reader's are what the page is there to explain.
          collapse={
            publicReader
              ? undefined
              : {
                  more: t("page.overview.readMore"),
                  less: t("common.showLess"),
                }
          }
        />
      </div>
    ),
  };

  // Literal class sets, one per reader, so Tailwind sees every name.
  const headLayout = publicReader
    ? {
        grid: "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-6 @6xl/overview-head:grid-cols-[minmax(0,1fr)_minmax(0,26rem)_auto] @6xl/overview-head:gap-x-6",
        actions:
          "col-start-2 row-start-1 flex shrink-0 items-center gap-1.5 @6xl/overview-head:col-start-3",
        ask: "col-span-full row-start-2 max-w-3xl @6xl/overview-head:col-span-1 @6xl/overview-head:col-start-2 @6xl/overview-head:row-start-1 @6xl/overview-head:max-w-none @6xl/overview-head:-mt-1.5",
        summary: "col-span-full row-start-3 @6xl/overview-head:row-start-2",
      }
    : {
        grid: "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-6 @4xl/overview-head:grid-cols-[minmax(0,1fr)_minmax(0,26rem)_auto] @4xl/overview-head:gap-x-6",
        actions:
          "col-start-2 row-start-1 flex shrink-0 items-center gap-1.5 @4xl/overview-head:col-start-3",
        ask: "col-span-full row-start-2 max-w-3xl @4xl/overview-head:col-span-1 @4xl/overview-head:col-start-2 @4xl/overview-head:row-start-1 @4xl/overview-head:max-w-none @4xl/overview-head:-mt-1.5",
        summary: "col-span-full row-start-3 @4xl/overview-head:row-start-2",
      };

  const visibleWidgetIds = layout.order.filter(
    (id) => !layout.hidden.includes(id),
  );
  const narrativeOnly = Boolean(reportState) || !hasActivity;

  return (
    // The ledger pages' shared column and gutter.
    // An article's page: the headline and its chart sit on the page itself,
    // and the modules under them are quiet tinted panels, with no outline or
    // shadow, so nothing frames a figure more loudly than the headline.
    // A module marked plain sits on the page like the hero, so the page
    // alternates between open charts and panels of detail.
    <LedgerPage className="space-y-10 pb-4 md:space-y-14 [&_[data-slot=card]:not([data-plain])]:rounded-xl [&_[data-slot=card]:not([data-plain])]:border-0 [&_[data-slot=card]:not([data-plain])]:bg-muted/50 [&_[data-slot=card]:not([data-plain])]:shadow-none">
      {/* The page's own header, not a card: the ledger's name, its actions,
          and the question box. Writers already know which page this is, so
          the sentence describing the dashboard is kept for public readers,
          who arrive without that context. */}
      <header
        className={`@container/overview-head ${SECTION_ENTRANCE}`}
        style={sectionDelay(0)}
      >
        {/* One grid: the name and the actions on the first row, and the
            question box beside them where the header itself has room —
            measured on the header, not the window, which a sidebar narrows.
            A public reader's long title and introduction need more of that
            room before the box sits beside them. Otherwise the box follows
            the name, ahead of the month and its figures. */}
        <div className={headLayout.grid}>
          <div className="min-w-0">
            <h1
              ref={overviewHeading}
              tabIndex={-1}
              // The ledger's name labels the page; the month's summary
              // below is what it says, so that is the larger type. A
              // public reader arrives without context: the title leads.
              // The ledger pages' title size; on its home page the
              // ledger's own name is the title.
              className={`text-2xl font-semibold tracking-tight outline-none ${publicReader ? "" : "truncate"}`}
            >
              {displayName}
            </h1>
            {publicReader && (
              <PublicLedgerIntroduction
                ledgerId={ledgerId}
                initialReadme={initialReadme}
                name={displayName}
                description={ledgerData.description}
                readmeVisible={visibleWidgetIds.includes("readme")}
              />
            )}
          </div>
          <div className={headLayout.actions}>
            <LedgerWritePermission>
              <Button asChild variant="outline" className="pointer-coarse:h-11">
                <Link
                  to="/ledger/$ledgerOwner/$ledgerName/import"
                  params={{ ledgerOwner, ledgerName }}
                >
                  <FileUp />
                  {t("common.relatedLinks.import")}
                </Link>
              </Button>
            </LedgerWritePermission>
            {showStarButton && (
              <StarButton
                ledgerId={ledgerId}
                isStarred={isStarred}
                starLabel={t("page.overview.starButton.star")}
                starredLabel={t("page.overview.starButton.starred")}
              />
            )}
            <DashboardCustomizer
              showTrigger={!publicReader}
              layout={layout}
              setVisible={setVisible}
              move={move}
              reset={reset}
              open={customizing}
              onOpenChange={(open) => {
                // Opened by its own header trigger: Radix returns focus there.
                if (open) customizeOpener.current = null;
                setCustomizing(open);
              }}
              returnFocus={customizeOpener}
              closeFocusFallback={overviewHeading}
            />
          </div>
          {heroShown && (
            <div className={headLayout.summary}>
              <MonthSummary
                dates={month.dates}
                selectedDate={month.selectedDate}
                onSelectDate={month.setSelectedDate}
                dataThrough={dataThrough}
                ledgerDataThrough={ledgerDataThrough}
                income={overview?.incomeIntervalData ?? []}
                expenses={overview?.expensesIntervalData ?? []}
                netWorth={market?.netWorthData ?? []}
                primaryCurrency={primaryCurrency}
                today={today}
              />
            </div>
          )}
          <div className={headLayout.ask}>
            <QuickAskInput />
          </div>
        </div>
      </header>

      {reportState ? (
        <div id="overview-report-state">{reportState}</div>
      ) : !hasActivity ? (
        <div id="overview-report-state">
          {hasActiveFilters ? (
            <ReportEmptyState
              Icon={Filter}
              title={t("page.overview.filteredEmptyTitle")}
              message={t("page.overview.filteredEmptyDescription")}
            />
          ) : (
            <EmptyLedgerSetup
              ledgerOwner={ledgerOwner}
              ledgerName={ledgerName}
              entryFile={
                ledgerData.bcioOptions.transactionFile ??
                ledgerData.bcioOptions.defaultFile
              }
              canWrite={canWrite}
            />
          )}
        </div>
      ) : visibleWidgetIds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {t("page.overview.allWidgetsHidden")}
            </p>
            <CustomizeButton
              aria-haspopup="dialog"
              onClick={(event) => {
                customizeOpener.current = event.currentTarget;
                setCustomizing(true);
              }}
            />
          </CardContent>
        </Card>
      ) : (
        visibleWidgetIds.map((id, index) => (
          <div
            key={id}
            id={`overview-widget-${id}`}
            className={`scroll-mt-4 ${SECTION_ENTRANCE}`}
            style={sectionDelay(index + 1)}
          >
            <ErrorBoundary>{widgets[id]}</ErrorBoundary>
          </div>
        ))
      )}

      {publicReader && narrativeOnly && visibleWidgetIds.includes("readme") && (
        <ErrorBoundary>{widgets.readme}</ErrorBoundary>
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
    </LedgerPage>
  );
}
