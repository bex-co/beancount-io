import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import { ClientOnly } from "@tanstack/react-router";
import { Tabs, TabsContent } from "@/common/components/ui/tabs";
import { Button } from "@/common/components/ui/button";
import {
  type GetLedgerTrialBalanceQuery,
  type SerializableTreeNode,
} from "@/graphql/definitions";
import { ResponsiveTabTriggerList } from "@/common/components/responsive-tab-trigger-list";
import { useMemo, useState } from "react";
import { HierarchyList } from "../balance-sheet/hierarchy-list";
import { HierarchyVisualizationCard } from "../balance-sheet/hierarchy-visualization-card";
import { ChevronDown, ChevronUp, List } from "lucide-react";
import type { ConversionOption } from "@/common/types/chart";
import { ConversionSelect } from "@/common/components/conversion-select";
import { useCookieStorageState } from "@/common/hooks/use-cookie-storage-state";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { filterAccountHierarchy } from "../balance-sheet/utils";

interface TrialBalanceContentProps {
  trialBalanceData: GetLedgerTrialBalanceQuery["getLedgerTrialBalance"];
  primaryCurrency: string;
  ledgerDisplayName: string;
  ledgerOwner: string;
  ledgerNameParam: string;
  conversion: ConversionOption;
  onConversionChange: (value: ConversionOption) => void;
  invertIncomeLiabilitiesEquity: boolean;
  showZeroBalance: boolean;
  showZeroTransactions: boolean;
  showClosedAccounts: boolean;
  closedAccountNames: Set<string>;
  collapsePatterns: string[];
}

export function TrialBalanceContent({
  trialBalanceData,
  primaryCurrency,
  ledgerDisplayName,
  ledgerOwner,
  ledgerNameParam,
  conversion,
  onConversionChange,
  invertIncomeLiabilitiesEquity,
  showZeroBalance,
  showZeroTransactions,
  showClosedAccounts,
  closedAccountNames,
  collapsePatterns,
}: TrialBalanceContentProps) {
  const { t } = useTranslations();
  const [selectedTab, setSelectedTab] = useState<string>("assets");
  const tabOptions = [
    { label: t("common.assets"), value: "assets" },
    { label: t("common.liabilities"), value: "liabilities" },
    { label: t("common.income"), value: "income" },
    { label: t("common.expenses"), value: "expenses" },
    { label: t("common.equity"), value: "equity" },
  ];
  const [chartsVisible, setChartsVisible] = useCookieStorageState(
    "beancount.chartsVisible.trialBalance",
    true,
    {
      serializer: (v) => String(v),
      deserializer: (v) => v !== "false",
    },
  );
  const toggleChartsVisible = () => setChartsVisible((prev) => !prev);

  const filterOptions = {
    showZeroBalance,
    showZeroTransactions,
    showClosedAccounts,
    closedAccountNames,
  };

  const assetsHierarchy = filterAccountHierarchy(
    trialBalanceData.assetsHierarchyData as SerializableTreeNode,
    filterOptions,
  );
  const liabilitiesHierarchy = filterAccountHierarchy(
    trialBalanceData.liabilitiesHierarchyData as SerializableTreeNode,
    filterOptions,
  );
  const incomeHierarchy = filterAccountHierarchy(
    trialBalanceData.incomeHierarchyData as SerializableTreeNode,
    filterOptions,
  );
  const expensesHierarchy = filterAccountHierarchy(
    trialBalanceData.expensesHierarchyData as SerializableTreeNode,
    filterOptions,
  );
  const equityHierarchy = filterAccountHierarchy(
    trialBalanceData.equityHierarchyData as SerializableTreeNode,
    filterOptions,
  );

  const hierarchyData = useMemo(() => {
    const opts = {
      showZeroBalance,
      showZeroTransactions,
      showClosedAccounts,
      closedAccountNames,
    };
    return [
      {
        ...filterAccountHierarchy(
          trialBalanceData.equityHierarchyData as SerializableTreeNode,
          opts,
        ),
        inverted: invertIncomeLiabilitiesEquity,
      },
      {
        ...filterAccountHierarchy(
          trialBalanceData.liabilitiesHierarchyData as SerializableTreeNode,
          opts,
        ),
        inverted: invertIncomeLiabilitiesEquity,
      },
      {
        ...filterAccountHierarchy(
          trialBalanceData.incomeHierarchyData as SerializableTreeNode,
          opts,
        ),
        inverted: invertIncomeLiabilitiesEquity,
      },
      filterAccountHierarchy(
        trialBalanceData.assetsHierarchyData as SerializableTreeNode,
        opts,
      ),
      filterAccountHierarchy(
        trialBalanceData.expensesHierarchyData as SerializableTreeNode,
        opts,
      ),
    ];
  }, [
    trialBalanceData,
    invertIncomeLiabilitiesEquity,
    showZeroBalance,
    showZeroTransactions,
    showClosedAccounts,
    closedAccountNames,
  ]);

  return (
    <div className="space-y-6">
      <LedgerPageSEO seoKey="ledgerTrialBalance" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          className="min-w-0"
          title={t("common.trialBalance")}
          description={t("common.pageDescription.trialBalance", {
            ledgerName: ledgerDisplayName,
          })}
        />
        <ClientOnly>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
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
          {/* Tabbed Interface */}
          <Tabs defaultValue="assets">
            <div className="flex items-center justify-between mb-2">
              <ResponsiveTabTriggerList
                selectedTab={selectedTab}
                setSelectedTab={setSelectedTab}
                tabOptions={tabOptions}
              />
              <ClientOnly>
                <div className="items-center gap-2 hidden lg:flex">
                  <ConversionSelect
                    value={conversion}
                    onValueChange={onConversionChange}
                    currency={primaryCurrency}
                  />
                </div>
              </ClientOnly>
            </div>

            {/* Assets Tab */}
            <TabsContent value="assets">
              <HierarchyVisualizationCard
                data={assetsHierarchy}
                title={t("page.trialBalance.assetsHierarchy")}
                description={t("page.trialBalance.assetsHierarchyDescription", {
                  ledgerName: ledgerDisplayName,
                })}
                hierarchyTitle={t("common.assets")}
                currency={primaryCurrency}
              />
            </TabsContent>

            {/* Liabilities Tab */}
            <TabsContent value="liabilities">
              <HierarchyVisualizationCard
                data={liabilitiesHierarchy}
                title={t("page.trialBalance.liabilitiesHierarchy")}
                description={t(
                  "page.trialBalance.liabilitiesHierarchyDescription",
                  {
                    ledgerName: ledgerDisplayName,
                  },
                )}
                hierarchyTitle={t("common.liabilities")}
                inverse
                currency={primaryCurrency}
              />
            </TabsContent>

            {/* Income Tab */}
            <TabsContent value="income">
              <HierarchyVisualizationCard
                data={incomeHierarchy}
                title={t("page.trialBalance.incomeHierarchy")}
                description={t("page.trialBalance.incomeHierarchyDescription", {
                  ledgerName: ledgerDisplayName,
                })}
                hierarchyTitle={t("common.income")}
                inverse
                currency={primaryCurrency}
              />
            </TabsContent>

            {/* Expenses Tab */}
            <TabsContent value="expenses">
              <HierarchyVisualizationCard
                data={expensesHierarchy}
                title={t("page.trialBalance.expensesHierarchy")}
                description={t(
                  "page.trialBalance.expensesHierarchyDescription",
                  {
                    ledgerName: ledgerDisplayName,
                  },
                )}
                hierarchyTitle={t("common.expenses")}
                currency={primaryCurrency}
              />
            </TabsContent>

            {/* Equity Tab */}
            <TabsContent value="equity">
              <HierarchyVisualizationCard
                data={equityHierarchy}
                title={t("page.trialBalance.equityHierarchy")}
                description={t("page.trialBalance.equityHierarchyDescription", {
                  ledgerName: ledgerDisplayName,
                })}
                hierarchyTitle={t("common.equity")}
                inverse
                currency={primaryCurrency}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div>
        <div className="space-y-2">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <List className="h-5 w-5" />
              {t("page.trialBalance.overviewTitle")}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("page.trialBalance.overviewDescription")}
            </p>
          </div>
          <HierarchyList
            data={hierarchyData}
            primaryCurrency={primaryCurrency}
            collapsePatterns={collapsePatterns}
          />
        </div>
      </div>

      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.balanceSheet"),
            to: `/ledger/${ledgerOwner}/${ledgerNameParam}/balance-sheet`,
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
            label: t("common.relatedLinks.overview"),
            to: `/ledger/${ledgerOwner}/${ledgerNameParam}`,
          },
        ]}
      />
    </div>
  );
}
