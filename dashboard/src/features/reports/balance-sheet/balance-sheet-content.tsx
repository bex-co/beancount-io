import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { ClientOnly } from "@tanstack/react-router";
import { Tabs, TabsContent } from "@/common/components/ui/tabs";
import { Button } from "@/common/components/ui/button";
import {
  TrendingUp,
  Wallet,
  TrendingDown,
  Scale,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type {
  GetLedgerBalanceSheetQuery,
  SerializableTreeNode,
} from "@/graphql/definitions";
import { LineChart } from "./line-chart";
import { HierarchyVisualizationCard } from "./hierarchy-visualization-card";
import { HierarchyListCard } from "./hierarchy-list-card";
import { useState } from "react";
import type { ChartInterval, ConversionOption } from "@/common/types/chart";
import { useCookieStorageState } from "@/common/hooks/use-cookie-storage-state";
import { IntervalSelect } from "@/common/components/interval-select";
import { ConversionSelect } from "@/common/components/conversion-select";
import { ResponsiveTabTriggerList } from "@/common/components/responsive-tab-trigger-list";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { filterAccountHierarchy } from "./utils";

interface BalanceSheetContentProps {
  balanceSheetData: GetLedgerBalanceSheetQuery["getLedgerBalanceSheet"];
  primaryCurrency: string;
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
}

export function BalanceSheetContent({
  balanceSheetData,
  primaryCurrency,
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
  const [chartsVisible, setChartsVisible] = useCookieStorageState(
    "beancount.chartsVisible.balanceSheet",
    true,
    {
      serializer: (v) => String(v),
      deserializer: (v) => v !== "false",
    },
  );
  const toggleChartsVisible = () => setChartsVisible((prev) => !prev);

  const hierarchyFilterOptions = {
    showZeroBalance,
    showZeroTransactions,
    showClosedAccounts,
    closedAccountNames,
  };

  const assetsHierarchy = filterAccountHierarchy(
    balanceSheetData.assetsHierarchyData as SerializableTreeNode,
    hierarchyFilterOptions,
  );
  const liabilitiesHierarchy = filterAccountHierarchy(
    balanceSheetData.liabilitiesHierarchyData as SerializableTreeNode,
    hierarchyFilterOptions,
  );
  const equityHierarchy = filterAccountHierarchy(
    balanceSheetData.equityHierarchyData as SerializableTreeNode,
    hierarchyFilterOptions,
  );

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
            <Button
              variant="outline"
              size="icon-sm"
              onClick={toggleChartsVisible}
              aria-label={chartsVisible ? "Hide charts" : "Show charts"}
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
                description={t(
                  "page.reports.hierarchyVisualizationDescription",
                  {
                    ledgerName: ledgerDisplayName,
                    sectionName: t("common.assets"),
                  },
                )}
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
                description={t(
                  "page.reports.hierarchyVisualizationDescription",
                  {
                    ledgerName: ledgerDisplayName,
                    sectionName: t("common.liabilities"),
                  },
                )}
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
                description={t(
                  "page.reports.hierarchyVisualizationDescription",
                  {
                    ledgerName: ledgerDisplayName,
                    sectionName: t("common.equity"),
                  },
                )}
                hierarchyTitle={t("common.equity")}
                inverse
                currency={primaryCurrency}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

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
            label: t("common.relatedLinks.trialBalance"),
            to: `/ledger/${ledgerOwner}/${ledgerNameParam}/trial-balance`,
          },
        ]}
      />
    </div>
  );
}
