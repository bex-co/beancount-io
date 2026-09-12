import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TrialBalanceContent } from "../trial-balance-content";

vi.mock("@tanstack/react-router", () => ({
  ClientOnly: ({ children }: { children: React.ReactNode }) => children,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/common/hooks/use-cookie-storage-state", () => ({
  useCookieStorageState: (_key: string, initial: unknown) => [initial, vi.fn()],
}));

// Heavy ECharts children: this test targets which panel is shown, not the chart.
vi.mock("../../balance-sheet/hierarchy-visualization-card", () => ({
  HierarchyVisualizationCard: ({
    hierarchyTitle,
  }: {
    hierarchyTitle: string;
  }) => <div data-testid="active-chart">{hierarchyTitle}</div>,
}));
vi.mock("../../balance-sheet/hierarchy-list", () => ({
  HierarchyList: () => null,
}));
vi.mock("@/common/components/related-links", () => ({
  RelatedLinks: () => null,
}));

// Stands in for the narrow-viewport view picker so the test can drive the same
// setSelectedTab callback the real Radix select calls.
vi.mock("@/common/components/responsive-tab-trigger-list", () => ({
  ResponsiveTabTriggerList: ({
    setSelectedTab,
    tabOptions,
  }: {
    setSelectedTab: (value: string) => void;
    tabOptions: { label: string; value: string }[];
  }) => (
    <div>
      {tabOptions.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => setSelectedTab(tab.value)}
        >
          {`pick-${tab.value}`}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/common/components/conversion-select", () => ({
  ConversionSelect: ({
    value,
    onValueChange,
  }: {
    value: string;
    onValueChange: (value: string) => void;
  }) => (
    <button
      type="button"
      data-testid="conversion-select"
      onClick={() => onValueChange("units")}
    >
      {`conversion:${value}`}
    </button>
  ),
}));

function hierarchyNode(account: string) {
  return {
    __typename: "SerializableTreeNode" as const,
    account,
    balance: { USD: "1.00" },
    balanceChildren: { USD: "1.00" },
    children: [],
    hasTxns: true,
    cost: null,
    costChildren: null,
  };
}

const trialBalanceData = {
  assetsHierarchyData: hierarchyNode("Assets"),
  liabilitiesHierarchyData: hierarchyNode("Liabilities"),
  incomeHierarchyData: hierarchyNode("Income"),
  expensesHierarchyData: hierarchyNode("Expenses"),
  equityHierarchyData: hierarchyNode("Equity"),
};

function renderContent(onConversionChange = vi.fn()) {
  render(
    <TrialBalanceContent
      trialBalanceData={
        trialBalanceData as unknown as React.ComponentProps<
          typeof TrialBalanceContent
        >["trialBalanceData"]
      }
      primaryCurrency="USD"
      ledgerDisplayName="Demo Books"
      ledgerOwner="demo"
      ledgerNameParam="books"
      conversion="at_cost"
      onConversionChange={onConversionChange}
      invertIncomeLiabilitiesEquity={false}
      showZeroBalance
      showZeroTransactions
      showClosedAccounts={false}
      closedAccountNames={new Set<string>()}
      collapsePatterns={[]}
    />,
  );
  return { onConversionChange };
}

describe("TrialBalanceContent", () => {
  it("shows the assets chart by default", () => {
    renderContent();

    expect(screen.getByTestId("active-chart")).toHaveTextContent("Assets");
  });

  it("swaps the displayed chart when the narrow view picker changes", async () => {
    const user = userEvent.setup();
    renderContent();

    await user.click(screen.getByRole("button", { name: "pick-equity" }));

    // Regression: the Tabs root used to be uncontrolled, so the narrow select
    // moved its own state while the assets panel stayed on screen.
    expect(screen.getByTestId("active-chart")).toHaveTextContent("Equity");

    await user.click(screen.getByRole("button", { name: "pick-income" }));

    expect(screen.getByTestId("active-chart")).toHaveTextContent("Income");
  });

  it("offers the conversion selector regardless of viewport width", async () => {
    const user = userEvent.setup();
    const { onConversionChange } = renderContent();

    // Exactly one conversion control, and it is not gated behind a
    // desktop-only wrapper (it used to be inside `hidden lg:flex`).
    const conversionSelects = screen.getAllByTestId("conversion-select");
    expect(conversionSelects).toHaveLength(1);
    expect(conversionSelects[0].parentElement?.className).not.toMatch(
      /\bhidden\b/,
    );

    // The single shared conversion state drives it — no mobile-only duplicate.
    expect(conversionSelects[0]).toHaveTextContent("conversion:at_cost");
    await user.click(conversionSelects[0]);
    expect(onConversionChange).toHaveBeenCalledWith("units");
  });
});
