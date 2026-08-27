import { useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, DollarSign, Layers } from "lucide-react";
import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { Tabs, TabsContent } from "@/common/components/ui/tabs";
import { Button } from "@/common/components/ui/button";
import { ResponsiveTabTriggerList } from "@/common/components/responsive-tab-trigger-list";
import { ConversionSelect } from "@/common/components/conversion-select";
import { IntervalSelect } from "@/common/components/interval-select";
import { useCookieStorageState } from "@/common/hooks/use-cookie-storage-state";
import { useTranslations } from "@/common/hooks/use-translations";
import { sortUsdFirst } from "@/common/lib/utils/sort";
import type { ChartInterval, ConversionOption } from "@/common/types/chart";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import { formatStatementAmount } from "../export/amount";
import { StatementExportMenu } from "../export/statement-export-menu";
import {
  buildCashFlowDocument,
  type ReportingEntitySource,
} from "../export/model";
import type { FiscalYearEnd } from "../export/reporting-period";
import { ActivityBreakdownChart, NetCashFlowChart } from "./cash-flow-charts";
import { CashAccountStatusPanel } from "./cash-account-status-panel";
import { HierarchyListCard } from "../balance-sheet/hierarchy-list-card";
import type { HierarchyListNode } from "../balance-sheet/hierarchy-list-types";
import { cashFlowSummaryLabelKey } from "../export/presentation";
import type { CashAccountStatusRow } from "./lib/cash-account-status";
import {
  buildActivityForest,
  buildCashAccountForest,
} from "./lib/statement-tree";
import {
  CASH_FLOW_ACTIVITIES,
  type CashAccountSnapshot,
  type CashFlowActivity,
  type CashFlowStatement,
} from "./lib/model";

interface CashFlowContentProps {
  statement: CashFlowStatement;
  /** Closing cash & equivalents snapshots — the bottom-line card's account rows. */
  closingCashAccounts: CashAccountSnapshot[];
  cashAccountRows: CashAccountStatusRow[];
  primaryCurrency: string;
  reportingEntityName: string;
  reportingEntitySource: ReportingEntitySource;
  ledgerDisplayName: string;
  ledgerOwner: string;
  ledgerNameParam: string;
  showClosedAccounts: boolean;
  conversion: ConversionOption;
  onConversionChange: (value: ConversionOption) => void;
  timeInterval: ChartInterval;
  onTimeIntervalChange: (value: ChartInterval) => void;
  filters: LedgerSearchParams;
  fiscalYearEnd: FiscalYearEnd;
  collapsePatterns: string[];
}

/** Every currency's exact-decimal amount, primary currency first. */
export function StatementAmounts({
  amounts,
  primaryCurrency,
  locale,
}: {
  amounts: Record<string, string>;
  primaryCurrency: string;
  locale: string;
}) {
  const currencies = sortUsdFirst(Object.keys(amounts), primaryCurrency);
  return (
    <div className="text-right tabular-nums whitespace-nowrap">
      {currencies.map((currency) => (
        <div key={currency}>
          {formatStatementAmount(amounts[currency], locale)} {currency}
        </div>
      ))}
    </div>
  );
}

export function CashFlowContent({
  statement,
  closingCashAccounts,
  cashAccountRows,
  primaryCurrency,
  reportingEntityName,
  reportingEntitySource,
  ledgerDisplayName,
  ledgerOwner,
  ledgerNameParam,
  showClosedAccounts,
  conversion,
  onConversionChange,
  timeInterval,
  onTimeIntervalChange,
  filters,
  fiscalYearEnd,
  collapsePatterns,
}: CashFlowContentProps) {
  const { t } = useTranslations();
  const activityTitles: Record<CashFlowActivity, string> = {
    operating: t("page.cashFlow.operating"),
    investing: t("page.cashFlow.investing"),
    financing: t("page.cashFlow.financing"),
  };
  const [selectedTab, setSelectedTab] = useState<string>("netCashFlow");
  const tabOptions = [
    { label: t("page.cashFlow.netCashFlow"), value: "netCashFlow" },
    { label: t("page.cashFlow.byActivity"), value: "byActivity" },
  ];
  const [chartsVisible, setChartsVisible] = useCookieStorageState(
    "beancount.chartsVisible.cashFlow",
    true,
    {
      serializer: (v) => String(v),
      deserializer: (v) => v !== "false",
    },
  );
  const toggleChartsVisible = () => setChartsVisible((prev) => !prev);

  const exportDocument = buildCashFlowDocument({
    title: t("common.cashFlow"),
    reportingEntity: reportingEntityName,
    reportingEntitySource,
    ledgerName: ledgerDisplayName,
    primaryCurrency,
    conversion,
    interval: timeInterval,
    filters,
    reportDates: statement.intervals.map((point) => point.date),
    fiscalYearEnd,
    statement,
    labels: {
      ...activityTitles,
      net_change: t("page.cashFlow.netChangeInCash"),
      openingCash: t("page.cashFlow.openingCash"),
      closingCash: t("page.cashFlow.closingCash"),
    },
  });

  // Memoized: HierarchyList resets its expansion state when `data` changes
  // identity, so the forests must survive UI-only re-renders.
  const activityForests = useMemo(
    () =>
      Object.fromEntries(
        CASH_FLOW_ACTIVITIES.map((activity) => [
          activity,
          buildActivityForest(
            statement.rows.filter((row) => row.activity === activity),
            primaryCurrency,
          ),
        ]),
      ) as Record<CashFlowActivity, HierarchyListNode[]>,
    [statement.rows, primaryCurrency],
  );
  const cashAccountForest = useMemo(
    () => buildCashAccountForest(closingCashAccounts, primaryCurrency),
    [closingCashAccounts, primaryCurrency],
  );

  const activitySection = (activity: CashFlowActivity) => (
    <HierarchyListCard
      data={activityForests[activity]}
      title={t("page.reports.hierarchyListTitle", {
        sectionName: activityTitles[activity],
      })}
      description={t("page.reports.hierarchyListDescription", {
        ledgerName: ledgerDisplayName,
        sectionName: activityTitles[activity],
      })}
      primaryCurrency={primaryCurrency}
      collapsePatterns={collapsePatterns}
      summaryRows={[
        {
          label: t(cashFlowSummaryLabelKey(`net_cash_${activity}`)),
          balance: statement.totals[activity],
          bold: true,
        },
      ]}
    />
  );

  return (
    <div className="space-y-6">
      <LedgerPageSEO seoKey="ledgerCashFlow" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          className="min-w-0"
          title={t("common.cashFlow")}
          description={t("common.pageDescription.cashFlow", {
            ledgerName: ledgerDisplayName,
          })}
        />
        <ClientOnly>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <StatementExportMenu document={exportDocument} />
            <Button
              variant="outline"
              size="icon-sm"
              onClick={toggleChartsVisible}
              aria-label={
                chartsVisible ? t("common.hideCharts") : t("common.showCharts")
              }
            >
              {chartsVisible ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </ClientOnly>
      </div>

      {/* Collapsible Chart Section */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          chartsVisible ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <Tabs
            defaultValue={selectedTab}
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="w-full flex-col justify-start gap-6"
          >
            <div className="flex items-center justify-between gap-2">
              <ResponsiveTabTriggerList
                selectedTab={selectedTab}
                setSelectedTab={setSelectedTab}
                tabOptions={tabOptions}
              />
              <ClientOnly>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <IntervalSelect
                    value={timeInterval}
                    onValueChange={onTimeIntervalChange}
                  />
                  <ConversionSelect
                    value={conversion}
                    onValueChange={onConversionChange}
                    currency={primaryCurrency}
                  />
                </div>
              </ClientOnly>
            </div>
            <TabsContent value="netCashFlow" className="mt-0 space-y-3">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t("page.cashFlow.netCashFlow")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("page.cashFlow.netCashFlowDescription", {
                    ledgerName: ledgerDisplayName,
                  })}
                </p>
              </div>
              <NetCashFlowChart
                data={statement.intervals}
                interval={timeInterval}
                primarySeries={primaryCurrency}
              />
            </TabsContent>
            <TabsContent value="byActivity" className="mt-0 space-y-3">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  {t("page.cashFlow.byActivity")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("page.cashFlow.byActivityDescription", {
                    ledgerName: ledgerDisplayName,
                  })}
                </p>
              </div>
              <ActivityBreakdownChart
                data={statement.intervals}
                interval={timeInterval}
                primarySeries={primaryCurrency}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 2 Column Grid: Operating + bottom line (left) | Investing + Financing (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {activitySection("operating")}
          <HierarchyListCard
            data={cashAccountForest}
            title={t("page.cashFlow.netChangeInCash")}
            description={t("page.cashFlow.netChangeDescription", {
              ledgerName: ledgerDisplayName,
            })}
            primaryCurrency={primaryCurrency}
            collapsePatterns={collapsePatterns}
            // Account rows show closing balances, so their total (period end)
            // comes first; then period start and the net change they explain.
            summaryRows={[
              {
                label: t(cashFlowSummaryLabelKey("closing_cash")),
                balance: statement.closing,
              },
              {
                label: t(cashFlowSummaryLabelKey("opening_cash")),
                balance: statement.opening,
              },
              {
                label: t(cashFlowSummaryLabelKey("net_change")),
                balance: statement.netChange,
                bold: true,
              },
            ]}
          />
        </div>
        <div className="space-y-4">
          {activitySection("investing")}
          {activitySection("financing")}
        </div>
      </div>

      <CashAccountStatusPanel
        rows={cashAccountRows}
        primaryCurrency={primaryCurrency}
        defaultShowClosed={showClosedAccounts}
      />

      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.overview"),
            to: `/ledger/${ledgerOwner}/${ledgerNameParam}`,
          },
          {
            label: t("common.relatedLinks.incomeStatement"),
            to: `/ledger/${ledgerOwner}/${ledgerNameParam}/income-statement`,
          },
          {
            label: t("common.relatedLinks.balanceSheet"),
            to: `/ledger/${ledgerOwner}/${ledgerNameParam}/balance-sheet`,
          },
          {
            label: t("common.relatedLinks.trialBalance"),
            to: `/ledger/${ledgerOwner}/${ledgerNameParam}/trial-balance`,
          },
        ]}
      />
    </div>
  );
}
