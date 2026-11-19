import { useState } from "react";
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
const hierarchyListMock = vi.fn(() => null);
vi.mock("../../balance-sheet/hierarchy-list", () => ({
  HierarchyList: (props: unknown) => hierarchyListMock(props),
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

function hierarchyNode(
  account: string,
  balance: Record<string, string> = { USD: "1.00" },
) {
  return {
    __typename: "SerializableTreeNode" as const,
    account,
    balance,
    balanceChildren: balance,
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

/**
 * The page owns the chart selection so it survives a pending read; this harness
 * owns it too, so the narrow view picker behaves as it does in production.
 */
type TrialBalanceData = React.ComponentProps<
  typeof TrialBalanceContent
>["trialBalanceData"];

function Harness({
  onConversionChange,
  data = trialBalanceData as unknown as TrialBalanceData,
  invert = false,
}: {
  onConversionChange: (value: "at_cost" | "units" | "at_value") => void;
  /** Override the fixture for a case that needs its own hierarchy. */
  data?: TrialBalanceData;
  invert?: boolean;
}) {
  const [selectedTab, setSelectedTab] = useState("assets");
  return (
    <TrialBalanceContent
      selectedTab={selectedTab}
      onSelectedTabChange={setSelectedTab}
      trialBalanceData={data}
      primaryCurrency="USD"
      ledgerDisplayName="Demo Books"
      ledgerOwner="demo"
      ledgerNameParam="books"
      conversion="at_cost"
      onConversionChange={onConversionChange}
      invertIncomeLiabilitiesEquity={invert}
      showZeroBalance
      showZeroTransactions
      showClosedAccounts={false}
      closedAccountNames={new Set<string>()}
      collapsePatterns={[]}
    />
  );
}

function renderContent(onConversionChange = vi.fn()) {
  render(<Harness onConversionChange={onConversionChange} />);
  return { onConversionChange };
}

describe("TrialBalanceContent", () => {
  it.each([false, true])(
    "passes a reconciliation summary row to the hierarchy table (credits inverted=%s, w4/267)",
    (invert) => {
      hierarchyListMock.mockClear();
      render(
        <Harness
          invert={invert}
          onConversionChange={vi.fn()}
          data={
            {
              assetsHierarchyData: hierarchyNode("Assets", { USD: "100" }),
              expensesHierarchyData: hierarchyNode("Expenses", { USD: "100" }),
              equityHierarchyData: hierarchyNode("Equity", { USD: "-50" }),
              liabilitiesHierarchyData: hierarchyNode("Liabilities", {
                USD: "-50",
              }),
              incomeHierarchyData: hierarchyNode("Income", { USD: "-100" }),
            } as unknown as TrialBalanceData
          }
        />,
      );

      const props = hierarchyListMock.mock.calls.at(-1)?.[0] as {
        summaryRows?: Array<{ label: string; balance: Record<string, string> }>;
      };

      expect(props.summaryRows).toHaveLength(1);
      expect(props.summaryRows?.[0]).toMatchObject({
        label: "Reconciliation Difference",
        balance: { USD: "0" },
        bold: true,
      });
    },
  );

  // w1/291: holdings valued at market leave the roots out by their gain; the
  // server's adjustment line carries it, so correct books reconcile to zero.
  it.each([false, true])(
    "shows the valuation adjustment line and nets through it (credits inverted=%s)",
    (invert) => {
      hierarchyListMock.mockClear();
      render(
        <Harness
          invert={invert}
          onConversionChange={vi.fn()}
          data={
            {
              assetsHierarchyData: hierarchyNode("Assets", {
                USD: "1109.0000",
              }),
              expensesHierarchyData: hierarchyNode("Expenses", {}),
              equityHierarchyData: hierarchyNode("Equity", {
                USD: "-1000.00",
              }),
              liabilitiesHierarchyData: hierarchyNode("Liabilities", {}),
              incomeHierarchyData: hierarchyNode("Income", {}),
              valuationAdjustment: { USD: "-109.0000" },
            } as unknown as TrialBalanceData
          }
        />,
      );

      const props = hierarchyListMock.mock.calls.at(-1)?.[0] as {
        summaryRows?: Array<Record<string, unknown>>;
      };

      expect(props.summaryRows).toEqual([
        {
          label: "Valuation/translation adjustment",
          balance: { USD: "-109.0000" },
          inverted: invert,
        },
        {
          label: "Reconciliation Difference",
          balance: { USD: "0.0000" },
          bold: true,
        },
      ]);
    },
  );

  // w1/305: on a USD-only ledger, two 3.333 USD legs against -6.67 USD leave
  // 0.004 USD the tolerance accepted. It is rounding, not valuation, so it
  // gets its own line and the valuation line stays away.
  it.each([false, true])(
    "shows accepted rounding under its own label and nets through it (credits inverted=%s)",
    (invert) => {
      hierarchyListMock.mockClear();
      render(
        <Harness
          invert={invert}
          onConversionChange={vi.fn()}
          data={
            {
              assetsHierarchyData: hierarchyNode("Assets", { USD: "93.33" }),
              expensesHierarchyData: hierarchyNode("Expenses", {
                USD: "6.666",
              }),
              equityHierarchyData: hierarchyNode("Equity", {
                USD: "-100.00",
              }),
              liabilitiesHierarchyData: hierarchyNode("Liabilities", {}),
              incomeHierarchyData: hierarchyNode("Income", {}),
              valuationAdjustment: {},
              roundingResidual: { USD: "0.004" },
            } as unknown as TrialBalanceData
          }
        />,
      );

      const props = hierarchyListMock.mock.calls.at(-1)?.[0] as {
        summaryRows?: Array<Record<string, unknown>>;
      };

      expect(props.summaryRows).toEqual([
        {
          label: "Rounding residual",
          balance: { USD: "0.004" },
          inverted: invert,
        },
        {
          label: "Reconciliation Difference",
          balance: { USD: "0.000" },
          bold: true,
        },
      ]);
    },
  );

  it.each([null, {}])(
    "shows no adjustment line when the server derives none (%j)",
    (valuationAdjustment) => {
      hierarchyListMock.mockClear();
      render(
        <Harness
          onConversionChange={vi.fn()}
          data={
            {
              ...trialBalanceData,
              valuationAdjustment,
              roundingResidual: valuationAdjustment,
            } as unknown as TrialBalanceData
          }
        />,
      );

      const props = hierarchyListMock.mock.calls.at(-1)?.[0] as {
        summaryRows?: Array<{ label: string }>;
      };

      expect(props.summaryRows?.map((row) => row.label)).toEqual([
        "Reconciliation Difference",
      ]);
    },
  );

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
