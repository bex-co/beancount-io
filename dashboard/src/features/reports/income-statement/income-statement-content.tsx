import { useState, useMemo } from "react";
import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { ClientOnly } from "@tanstack/react-router";
import { Tabs, TabsContent } from "@/common/components/ui/tabs";
import { Button } from "@/common/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type {
  GetLedgerIncomeStatementQuery,
  SerializableTreeNode,
} from "@/graphql/definitions";
import { DateBalanceChart } from "@/features/reports/income-statement/date-balance-chart";
import { useCookieStorageState } from "@/common/hooks/use-cookie-storage-state";
import type { ChartInterval, ConversionOption } from "@/common/types/chart";
import { ResponsiveTabTriggerList } from "@/common/components/responsive-tab-trigger-list";
import { IntervalSelect } from "@/common/components/interval-select";
import { ConversionSelect } from "@/common/components/conversion-select";
import { useTranslations } from "@/common/hooks/use-translations";
import { sortUsdFirst } from "@/common/lib/utils/sort";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { HierarchyVisualizationCard } from "../balance-sheet/hierarchy-visualization-card";
import { HierarchyListCard } from "../balance-sheet/hierarchy-list-card";
import { filterAccountHierarchy } from "../balance-sheet/utils";
import { ChartModeSelect, type ChartMode } from "./chart-mode-select";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import { StatementExportMenu } from "../export/statement-export-menu";
import {
  buildProfitAndLossDocument,
  sumBalanceRecords,
  type ReportingEntitySource,
} from "../export/model";
import type { FiscalYearEnd } from "../export/reporting-period";

interface IncomeStatementContentProps {
  incomeStatementData: GetLedgerIncomeStatementQuery["getLedgerIncomeStatement"];
  primaryCurrency: string;
  reportingEntityName: string;
  reportingEntitySource: ReportingEntitySource;
  ledgerDisplayName: string;
  ledgerOwner: string;
  ledgerNameParam: string;
  conversion: ConversionOption;
  timeInterval: ChartInterval;
  invertIncomeLiabilitiesEquity: boolean;
  showZeroBalance: boolean;
  showZeroTransactions: boolean;
  showClosedAccounts: boolean;
  closedAccountNames: Set<string>;
  collapsePatterns: string[];
  onConversionChange: (value: ConversionOption) => void;
  onTimeIntervalChange: (value: ChartInterval) => void;
  filters: LedgerSearchParams;
  fiscalYearEnd: FiscalYearEnd;
}

export function IncomeStatementContent({
  incomeStatementData,
  primaryCurrency,
  reportingEntityName,
  reportingEntitySource,
  ledgerDisplayName,
  ledgerOwner,
  ledgerNameParam,
  conversion,
  timeInterval,
  invertIncomeLiabilitiesEquity,
  showZeroBalance,
  showZeroTransactions,
  showClosedAccounts,
  closedAccountNames,
  collapsePatterns,
  onConversionChange,
  onTimeIntervalChange,
  filters,
  fiscalYearEnd,
}: IncomeStatementContentProps) {
  const { t } = useTranslations();
  const [selectedTab, setSelectedTab] = useState<string>("netProfit");
  const tabOptions = [
    { label: t("common.netProfit"), value: "netProfit" },
    { label: t("common.income"), value: "income" },
    { label: t("common.expenses"), value: "expenses" },
    {
      label: t("page.incomeStatement.incomeBreakdown"),
      value: "incomeBreakdown",
    },
    {
      label: t("page.incomeStatement.expensesBreakdown"),
      value: "expensesBreakdown",
    },
  ];
  const [chartMode, setChartMode] = useState<ChartMode>("stacked");
  const [chartsVisible, setChartsVisible] = useCookieStorageState(
    "beancount.chartsVisible.incomeStatement",
    true,
    {
      serializer: (v) => String(v),
      deserializer: (v) => v !== "false",
    },
  );
  const toggleChartsVisible = () => setChartsVisible((prev) => !prev);

  // Calculate totals using decimal strings so large and fractional accounting
  // values never pass through IEEE-754 arithmetic.
  const totalNetProfit = useMemo(() => {
    return sumBalanceRecords(
      incomeStatementData.netProfitData.map((item) => item.balance),
    );
  }, [incomeStatementData]);

  // Sort currencies with primary currency first
  const sortedCurrencies = useMemo(() => {
    return sortUsdFirst(Object.keys(totalNetProfit), primaryCurrency);
  }, [totalNetProfit, primaryCurrency]);

  // Transform totalNetProfit into SerializableTreeNode format for HierarchyListCard
  const netProfitTreeNode = useMemo((): SerializableTreeNode | null => {
    if (sortedCurrencies.length === 0) {
      return null;
    }

    const balance: Record<string, unknown> = {};
    Object.entries(totalNetProfit).forEach(([currency, value]) => {
      balance[currency] = value;
    });

    return {
      __typename: "SerializableTreeNode",
      account: "Net Profit",
      balance,
      balanceChildren: balance,
      children: [],
      cost: null,
      costChildren: null,
      hasTxns: false,
    };
  }, [totalNetProfit, sortedCurrencies]);

  const hierarchyFilterOptions = useMemo(
    () => ({
      showZeroBalance,
      showZeroTransactions,
      showClosedAccounts,
      closedAccountNames,
    }),
    [
      showZeroBalance,
      showZeroTransactions,
      showClosedAccounts,
      closedAccountNames,
    ],
  );

  const incomeHierarchy = useMemo(
    () =>
      filterAccountHierarchy(
        incomeStatementData.incomeHierarchyData as SerializableTreeNode,
        hierarchyFilterOptions,
      ),
    [hierarchyFilterOptions, incomeStatementData.incomeHierarchyData],
  );
  const expensesHierarchy = useMemo(() => {
    return filterAccountHierarchy(
      incomeStatementData.expensesHierarchyData as SerializableTreeNode,
      hierarchyFilterOptions,
    );
  }, [hierarchyFilterOptions, incomeStatementData.expensesHierarchyData]);
  const exportDocument = buildProfitAndLossDocument({
    title: t("common.incomeStatement"),
    reportingEntity: reportingEntityName,
    reportingEntitySource,
    ledgerName: ledgerDisplayName,
    primaryCurrency,
    conversion,
    interval: timeInterval,
    filters,
    reportDates: incomeStatementData.netProfitData.map((item) => item.date),
    fiscalYearEnd,
    income: incomeHierarchy,
    expenses: expensesHierarchy,
    netProfitBalances: incomeStatementData.netProfitData.map(
      (item) => item.balance,
    ),
    labels: {
      income: t("common.income"),
      expenses: t("common.expenses"),
      net_profit: t("reports.export.netIncome"),
    },
  });

  return (
    <div className="space-y-6">
      <LedgerPageSEO seoKey="ledgerIncomeStatement" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          className="min-w-0"
          title={t("common.incomeStatement")}
          description={t("common.pageDescription.incomeStatement", {
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
                  {(selectedTab === "income" || selectedTab === "expenses") && (
                    <ChartModeSelect
                      value={chartMode}
                      onValueChange={setChartMode}
                    />
                  )}
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
            <TabsContent value="netProfit" className="mt-0 space-y-3">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t("common.netProfit")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("page.incomeStatement.netProfitDescription", {
                    ledgerName: ledgerDisplayName,
                  })}
                </p>
              </div>
              <DateBalanceChart
                data={incomeStatementData.netProfitData}
                interval={timeInterval}
                primarySeries={primaryCurrency}
                inverted={invertIncomeLiabilitiesEquity}
              />
            </TabsContent>
            <TabsContent value="income" className="mt-0 space-y-3">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t("common.income")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("page.incomeStatement.incomeDescription", {
                    ledgerName: ledgerDisplayName,
                  })}
                </p>
              </div>
              <DateBalanceChart
                data={incomeStatementData.incomeData}
                interval={timeInterval}
                primarySeries={primaryCurrency}
                chartMode={chartMode}
                inverted={invertIncomeLiabilitiesEquity}
              />
            </TabsContent>
            <TabsContent value="expenses" className="mt-0 space-y-3">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  {t("common.expenses")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("page.incomeStatement.expensesDescription", {
                    ledgerName: ledgerDisplayName,
                  })}
                </p>
              </div>
              <DateBalanceChart
                data={incomeStatementData.expensesData}
                interval={timeInterval}
                primarySeries={primaryCurrency}
                chartMode={chartMode}
              />
            </TabsContent>
            <TabsContent value="incomeBreakdown" className="mt-0">
              <HierarchyVisualizationCard
                data={incomeHierarchy}
                title={t("page.reports.hierarchyTitle", {
                  sectionName: t("common.income"),
                })}
                description={t(
                  "page.reports.hierarchyVisualizationDescription",
                  {
                    ledgerName: ledgerDisplayName,
                    sectionName: t("common.income"),
                  },
                )}
                hierarchyTitle={t("common.income")}
                inverse
                currency={primaryCurrency}
              />
            </TabsContent>
            <TabsContent value="expensesBreakdown" className="mt-0">
              <HierarchyVisualizationCard
                data={expensesHierarchy}
                title={t("page.reports.hierarchyTitle", {
                  sectionName: t("common.expenses"),
                })}
                description={t(
                  "page.reports.hierarchyVisualizationDescription",
                  {
                    ledgerName: ledgerDisplayName,
                    sectionName: t("common.expenses"),
                  },
                )}
                hierarchyTitle={t("common.expenses")}
                currency={primaryCurrency}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 2 Column Grid: Summary + Income List (left) | Expenses List (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Net Profit Summary + Income List */}
        <div className="space-y-4">
          {/* Income List */}
          <HierarchyListCard
            data={incomeHierarchy}
            title={t("page.reports.hierarchyListTitle", {
              sectionName: t("common.income"),
            })}
            description={t("page.reports.hierarchyListDescription", {
              ledgerName: ledgerDisplayName,
              sectionName: t("common.income"),
            })}
            primaryCurrency={primaryCurrency}
            inverted={invertIncomeLiabilitiesEquity}
            collapsePatterns={collapsePatterns}
          />
          {/* Net Profit Summary */}
          {netProfitTreeNode && (
            <HierarchyListCard
              data={netProfitTreeNode}
              title={t("common.netProfit")}
              description={t("page.incomeStatement.totalNetProfitOverPeriod")}
              primaryCurrency={primaryCurrency}
              inverted={invertIncomeLiabilitiesEquity}
              collapsePatterns={collapsePatterns}
            />
          )}
        </div>

        {/* Right Column: Expenses List */}
        <HierarchyListCard
          data={expensesHierarchy}
          title={t("page.reports.hierarchyListTitle", {
            sectionName: t("common.expenses"),
          })}
          description={t("page.reports.hierarchyListDescription", {
            ledgerName: ledgerDisplayName,
            sectionName: t("common.expenses"),
          })}
          primaryCurrency={primaryCurrency}
          collapsePatterns={collapsePatterns}
        />
      </div>

      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.overview"),
            to: `/ledger/${ledgerOwner}/${ledgerNameParam}`,
          },
          {
            label: t("common.relatedLinks.balanceSheet"),
            to: `/ledger/${ledgerOwner}/${ledgerNameParam}/balance-sheet`,
          },
          {
            label: t("common.relatedLinks.cashFlow"),
            to: `/ledger/${ledgerOwner}/${ledgerNameParam}/cash-flow`,
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
