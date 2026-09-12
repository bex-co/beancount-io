import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { ClientOnly } from "@tanstack/react-router";
import { Tabs, TabsContent } from "@/common/components/ui/tabs";
import { TrendingUp, Wallet, TrendingDown, Scale } from "lucide-react";
import type {
  GetLedgerBalanceSheetQuery,
  SerializableTreeNode,
} from "@/graphql/definitions";
import { LineChart } from "./line-chart";
import { HierarchyVisualizationCard } from "./hierarchy-visualization-card";
import { HierarchyListCard } from "./hierarchy-list-card";
import { useMemo, useState } from "react";
import type { ChartInterval, ConversionOption } from "@/common/types/chart";
import {
  ChartsToggleButton,
  CollapsibleChartsSection,
} from "../components/collapsible-charts-section";
import { useChartsVisibility } from "../components/use-charts-visibility";
import { IntervalSelect } from "@/common/components/interval-select";
import { ConversionSelect } from "@/common/components/conversion-select";
import { ResponsiveTabTriggerList } from "@/common/components/responsive-tab-trigger-list";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { filterAccountHierarchy } from "./utils";
import type { LedgerSearchParams } from "@/common/providers/ledger-search-params-provider/context";
import { StatementExportMenu } from "../export/statement-export-menu";
import {
  buildBalanceSheetDocument,
  type ReportingEntitySource,
} from "../export/model";
import type { FiscalYearEnd } from "../export/reporting-period";

interface BalanceSheetContentProps {
  balanceSheetData: GetLedgerBalanceSheetQuery["getLedgerBalanceSheet"];
  primaryCurrency: string;
  reportingEntityName: string;
  reportingEntitySource: ReportingEntitySource;
  ledgerDisplayName: string;
  ledgerOwner: string;
  ledgerNameParam: string;
  conversion: ConversionOption;
  onConversionChange: (value: ConversionOption) => void;
  timeInterval: ChartInterval;
  onTimeIntervalChange: (value: ChartInterval) => void;
  invertIncomeLiabilitiesEquity: boolean;
  showZeroBalance: boolean;
  showZeroTransactions: boolean;
  showClosedAccounts: boolean;
  closedAccountNames: Set<string>;
  collapsePatterns: string[];
  filters: LedgerSearchParams;
  fiscalYearEnd: FiscalYearEnd;
}

export function BalanceSheetContent({
  balanceSheetData,
  primaryCurrency,
  reportingEntityName,
  reportingEntitySource,
  ledgerDisplayName,
  ledgerOwner,
  ledgerNameParam,
  conversion,
  onConversionChange,
  timeInterval,
  onTimeIntervalChange,
  invertIncomeLiabilitiesEquity,
  showZeroBalance,
  showZeroTransactions,
  showClosedAccounts,
  closedAccountNames,
  collapsePatterns,
  filters,
  fiscalYearEnd,
}: BalanceSheetContentProps) {
  const { t } = useTranslations();
  const [selectedTab, setSelectedTab] = useState<string>("netWorth");
  const tabOptions = [
    { label: t("common.netWorth"), value: "netWorth" },
    { label: t("common.assets"), value: "assets" },
    { label: t("common.liabilities"), value: "liabilities" },
    { label: t("common.equity"), value: "equity" },
    { label: t("page.balanceSheet.assetsBreakdown"), value: "assetsBreakdown" },
    {
      label: t("page.balanceSheet.liabilitiesBreakdown"),
      value: "liabilitiesBreakdown",
    },
    { label: t("page.balanceSheet.equityBreakdown"), value: "equityBreakdown" },
  ];
  const { chartsVisible, toggleChartsVisible, chartsSectionId } =
    useChartsVisibility("balanceSheet");

  // Memoized so unrelated re-renders (for example toggling the charts section)
  // keep the same tree identities — HierarchyList re-derives its expanded nodes
  // whenever `data` changes identity, which would reopen collapsed branches.
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

  const assetsHierarchy = useMemo(
    () =>
      filterAccountHierarchy(
        balanceSheetData.assetsHierarchyData as SerializableTreeNode,
        hierarchyFilterOptions,
      ),
    [balanceSheetData.assetsHierarchyData, hierarchyFilterOptions],
  );
  const liabilitiesHierarchy = useMemo(
    () =>
      filterAccountHierarchy(
        balanceSheetData.liabilitiesHierarchyData as SerializableTreeNode,
        hierarchyFilterOptions,
      ),
    [balanceSheetData.liabilitiesHierarchyData, hierarchyFilterOptions],
  );
  const equityHierarchy = useMemo(
    () =>
      filterAccountHierarchy(
        balanceSheetData.equityHierarchyData as SerializableTreeNode,
        hierarchyFilterOptions,
      ),
    [balanceSheetData.equityHierarchyData, hierarchyFilterOptions],
  );
  const exportDocument = buildBalanceSheetDocument({
    title: t("common.balanceSheet"),
    reportingEntity: reportingEntityName,
    reportingEntitySource,
    ledgerName: ledgerDisplayName,
    primaryCurrency,
    conversion,
    interval: timeInterval,
    filters,
    reportDates: [
      ...balanceSheetData.netWorthData,
      ...balanceSheetData.assetsData,
      ...balanceSheetData.liabilitiesData,
      ...balanceSheetData.equityData,
    ].map((item) => item.date),
    fiscalYearEnd,
    assets: assetsHierarchy,
    liabilities: liabilitiesHierarchy,
    equity: equityHierarchy,
    labels: {
      assets: t("common.assets"),
      liabilities: t("common.liabilities"),
      equity: t("common.equity"),
    },
  });

  return (
    <div className="space-y-6">
      <LedgerPageSEO seoKey="ledgerBalanceSheet" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          className="min-w-0"
          title={t("common.balanceSheet")}
          description={t("common.pageDescription.balanceSheet", {
            ledgerName: ledgerDisplayName,
          })}
        />
        <ClientOnly>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <StatementExportMenu document={exportDocument} />
            <ChartsToggleButton
              chartsVisible={chartsVisible}
              onToggle={toggleChartsVisible}
              chartsSectionId={chartsSectionId}
            />
          </div>
        </ClientOnly>
      </div>
      {/* Collapsible Chart Section */}
      <CollapsibleChartsSection
        id={chartsSectionId}
        chartsVisible={chartsVisible}
      >
        <Tabs
          defaultValue={selectedTab}
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="w-full flex-col justify-start gap-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
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
          <TabsContent value="netWorth" className="mt-0 space-y-3">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t("common.netWorth")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("page.balanceSheet.netWorthDescription", {
                  ledgerName: ledgerDisplayName,
                })}
              </p>
            </div>
            <LineChart
              data={balanceSheetData.netWorthData}
              interval={timeInterval}
              primarySeries={primaryCurrency}
            />
          </TabsContent>
          <TabsContent value="assets" className="mt-0 space-y-3">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                {t("common.assets")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("page.balanceSheet.assetsDescription", {
                  ledgerName: ledgerDisplayName,
                })}
              </p>
            </div>
            <LineChart
              data={balanceSheetData.assetsData}
              interval={timeInterval}
              primarySeries={primaryCurrency}
            />
          </TabsContent>
          <TabsContent value="liabilities" className="mt-0 space-y-3">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                {t("common.liabilities")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("page.balanceSheet.liabilitiesDescription", {
                  ledgerName: ledgerDisplayName,
                })}
              </p>
            </div>
            <LineChart
              data={balanceSheetData.liabilitiesData}
              interval={timeInterval}
              primarySeries={primaryCurrency}
              inverted={invertIncomeLiabilitiesEquity}
            />
          </TabsContent>
          <TabsContent value="equity" className="mt-0 space-y-3">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Scale className="h-5 w-5" />
                {t("common.equity")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("page.balanceSheet.equityDescription", {
                  ledgerName: ledgerDisplayName,
                })}
              </p>
            </div>
            <LineChart
              data={balanceSheetData.equityData}
              interval={timeInterval}
              primarySeries={primaryCurrency}
              inverted={invertIncomeLiabilitiesEquity}
            />
          </TabsContent>
          <TabsContent value="assetsBreakdown" className="mt-0">
            <HierarchyVisualizationCard
              data={assetsHierarchy}
              title={t("page.reports.hierarchyTitle", {
                sectionName: t("common.assets"),
              })}
              description={t("page.reports.hierarchyVisualizationDescription", {
                ledgerName: ledgerDisplayName,
                sectionName: t("common.assets"),
              })}
              hierarchyTitle={t("common.assets")}
              currency={primaryCurrency}
            />
          </TabsContent>
          <TabsContent value="liabilitiesBreakdown" className="mt-0">
            <HierarchyVisualizationCard
              data={liabilitiesHierarchy}
              title={t("page.reports.hierarchyTitle", {
                sectionName: t("common.liabilities"),
              })}
              description={t("page.reports.hierarchyVisualizationDescription", {
                ledgerName: ledgerDisplayName,
                sectionName: t("common.liabilities"),
              })}
              hierarchyTitle={t("common.liabilities")}
              inverse
              currency={primaryCurrency}
            />
          </TabsContent>
          <TabsContent value="equityBreakdown" className="mt-0">
            <HierarchyVisualizationCard
              data={equityHierarchy}
              title={t("page.reports.hierarchyTitle", {
                sectionName: t("common.equity"),
              })}
              description={t("page.reports.hierarchyVisualizationDescription", {
                ledgerName: ledgerDisplayName,
                sectionName: t("common.equity"),
              })}
              hierarchyTitle={t("common.equity")}
              inverse
              currency={primaryCurrency}
            />
          </TabsContent>
        </Tabs>
      </CollapsibleChartsSection>

      {/* 2 Column Grid: Assets List (left) | Liabilities + Equity Lists (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Assets List */}
        <HierarchyListCard
          data={assetsHierarchy}
          title={t("page.reports.hierarchyListTitle", {
            sectionName: t("common.assets"),
          })}
          description={t("page.reports.hierarchyListDescription", {
            ledgerName: ledgerDisplayName,
            sectionName: t("common.assets"),
          })}
          primaryCurrency={primaryCurrency}
          collapsePatterns={collapsePatterns}
        />

        {/* Right Column: Liabilities + Equity Lists */}
        <div className="space-y-6">
          <HierarchyListCard
            data={liabilitiesHierarchy}
            title={t("page.reports.hierarchyListTitle", {
              sectionName: t("common.liabilities"),
            })}
            description={t("page.reports.hierarchyListDescription", {
              ledgerName: ledgerDisplayName,
              sectionName: t("common.liabilities"),
            })}
            primaryCurrency={primaryCurrency}
            inverted={invertIncomeLiabilitiesEquity}
            collapsePatterns={collapsePatterns}
          />
          <HierarchyListCard
            data={equityHierarchy}
            title={t("page.reports.hierarchyListTitle", {
              sectionName: t("common.equity"),
            })}
            description={t("page.reports.hierarchyListDescription", {
              ledgerName: ledgerDisplayName,
              sectionName: t("common.equity"),
            })}
            primaryCurrency={primaryCurrency}
            inverted={invertIncomeLiabilitiesEquity}
            collapsePatterns={collapsePatterns}
          />
        </div>
      </div>

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
