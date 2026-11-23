import { LedgerPage, LedgerPageHeading } from "@/common/components/ledger-page";
import { RelatedLinks } from "@/common/components/related-links";
import { ClientOnly } from "@tanstack/react-router";
import { Tabs, TabsContent } from "@/common/components/ui/tabs";
import {
  type GetLedgerTrialBalanceQuery,
  type SerializableTreeNode,
} from "@/graphql/definitions";
import { ResponsiveTabTriggerList } from "@/common/components/responsive-tab-trigger-list";
import { useMemo } from "react";
import { HierarchyList } from "../balance-sheet/hierarchy-list";
import { HierarchyVisualizationCard } from "../balance-sheet/hierarchy-visualization-card";
import { List } from "lucide-react";
import type { ConversionOption } from "@/common/types/chart";
import { ConversionSelect } from "@/common/components/conversion-select";
import {
  ChartsToggleButton,
  CollapsibleChartsSection,
} from "../components/collapsible-charts-section";
import { useChartsVisibility } from "../components/use-charts-visibility";
import { useTranslations } from "@/common/hooks/use-translations";
import { filterAccountHierarchy } from "../balance-sheet/utils";
import type { HierarchySummaryRow } from "../balance-sheet/hierarchy-list-types";
import {
  computeTrialBalanceReconciliation,
  hasTrialBalanceReconciliationDifference,
} from "./lib/trial-balance-summary";

interface TrialBalanceContentProps {
  trialBalanceData: GetLedgerTrialBalanceQuery["getLedgerTrialBalance"];
  atCostData?: GetLedgerTrialBalanceQuery["getLedgerTrialBalance"];
  primaryCurrency: string;
  /**
   * Every currency the conversion selector offers, in ledger order. Defaults
   * to the primary alone, matching the single-currency selector of old.
   */
  operatingCurrencies?: readonly string[];
  ledgerDisplayName: string;
  ledgerOwner: string;
  ledgerNameParam: string;
  conversion: ConversionOption;
  onConversionChange: (value: ConversionOption) => void;
  /**
   * Owned by the page, which outlives the pending read that replaces this
   * component, so changing an interval or conversion regroups the selected
   * chart instead of resetting which chart the reader is looking at.
   */
  selectedTab: string;
  onSelectedTabChange: (value: string) => void;
  invertIncomeLiabilitiesEquity: boolean;
  showZeroBalance: boolean;
  showZeroTransactions: boolean;
  showClosedAccounts: boolean;
  closedAccountNames: Set<string>;
  collapsePatterns: string[];
}

export function TrialBalanceContent({
  trialBalanceData,
  atCostData,
  primaryCurrency,
  operatingCurrencies = [primaryCurrency],
  ledgerDisplayName,
  ledgerOwner,
  ledgerNameParam,
  conversion,
  onConversionChange,
  selectedTab,
  onSelectedTabChange,
  invertIncomeLiabilitiesEquity,
  showZeroBalance,
  showZeroTransactions,
  showClosedAccounts,
  closedAccountNames,
  collapsePatterns,
}: TrialBalanceContentProps) {
  const { t } = useTranslations();
  const tabOptions = [
    { label: t("common.assets"), value: "assets" },
    { label: t("common.liabilities"), value: "liabilities" },
    { label: t("common.income"), value: "income" },
    { label: t("common.expenses"), value: "expenses" },
    { label: t("common.equity"), value: "equity" },
  ];
  const { chartsVisible, toggleChartsVisible, chartsSectionId } =
    useChartsVisibility("trialBalance");

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

  const trialBalanceSummaryRows = useMemo((): HierarchySummaryRow[] => {
    const line = (value: unknown) =>
      (value ?? null) as Record<string, string> | null;
    // The server's lines for what valuation (w1/291) and the ledger's
    // accepted rounding (w1/305) leave unbalanced.
    const lines = [
      {
        label: t("page.trialBalance.valuationAdjustment"),
        balance: line(trialBalanceData.valuationAdjustment),
      },
      {
        label: t("page.trialBalance.roundingResidual"),
        balance: line(trialBalanceData.roundingResidual),
      },
    ];
    // Equity lines use the credit roots' display sign and conversion.
    const rows = lines.flatMap(({ label, balance }) =>
      balance && hasTrialBalanceReconciliationDifference(balance)
        ? [{ label, balance, inverted: invertIncomeLiabilitiesEquity }]
        : [],
    );

    const atCost = conversion === "at_cost";
    const basis = atCost ? trialBalanceData : atCostData;
    if (!basis) return rows;

    const difference = computeTrialBalanceReconciliation(
      [
        basis.equityHierarchyData,
        basis.liabilitiesHierarchyData,
        basis.incomeHierarchyData,
        basis.assetsHierarchyData,
        basis.expensesHierarchyData,
      ] as SerializableTreeNode[],
      line(basis.valuationAdjustment),
      line(basis.roundingResidual),
    );
    if (Object.keys(difference).length === 0) return rows;

    return [
      ...rows,
      {
        label: atCost
          ? t("reports.export.reconciliationDifference")
          : t("page.trialBalance.reconciliationAtCost"),
        balance: difference,
        bold: true,
      },
    ];
  }, [
    atCostData,
    conversion,
    trialBalanceData,
    invertIncomeLiabilitiesEquity,
    t,
  ]);

  return (
    <LedgerPage className="space-y-5 sm:space-y-6">
      <LedgerPageHeading
        title={t("common.trialBalance")}
        description={t("common.pageDescription.trialBalance", {
          ledgerName: ledgerDisplayName,
        })}
        actions={
          <ClientOnly
            fallback={
              <div
                className="flex h-8 w-32 shrink-0 items-center gap-2"
                aria-hidden="true"
              />
            }
          >
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <ChartsToggleButton
                chartsVisible={chartsVisible}
                onToggle={toggleChartsVisible}
                chartsSectionId={chartsSectionId}
              />
            </div>
          </ClientOnly>
        }
      />
      {/* Collapsible Chart Section */}
      <CollapsibleChartsSection
        id={chartsSectionId}
        chartsVisible={chartsVisible}
      >
        <div className="min-h-[380px] overflow-clip rounded-xl border bg-card p-4 shadow-sm sm:p-5">
          {/* Tabbed Interface */}
          <Tabs value={selectedTab} onValueChange={onSelectedTabChange}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <ResponsiveTabTriggerList
                selectedTab={selectedTab}
                setSelectedTab={onSelectedTabChange}
                tabOptions={tabOptions}
              />
              <ClientOnly
                fallback={
                  <div
                    className="flex h-8 w-44 shrink-0 items-center gap-2"
                    aria-hidden="true"
                  />
                }
              >
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <ConversionSelect
                    value={conversion}
                    onValueChange={onConversionChange}
                    currencies={operatingCurrencies}
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
      </CollapsibleChartsSection>

      <section
        aria-labelledby="trial-balance-hierarchy-heading"
        className="overflow-clip rounded-xl border bg-card shadow-sm"
      >
        <div className="border-b bg-muted/20 px-4 py-3">
          <h2
            id="trial-balance-hierarchy-heading"
            className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
          >
            <List
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            {t("page.trialBalance.overviewTitle")}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t("page.trialBalance.overviewDescription")}
          </p>
        </div>
        <HierarchyList
          data={hierarchyData}
          primaryCurrency={primaryCurrency}
          collapsePatterns={collapsePatterns}
          summaryRows={trialBalanceSummaryRows}
          ariaLabelledBy="trial-balance-hierarchy-heading"
        />
      </section>

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
    </LedgerPage>
  );
}
