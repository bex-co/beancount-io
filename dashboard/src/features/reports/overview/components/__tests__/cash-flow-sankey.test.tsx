import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CashFlowSankey from "../cash-flow-sankey";

// Mock ReactECharts
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: unknown }) => {
    const opt = option as { series?: unknown };
    const series = opt.series;
    const arr = Array.isArray(series) ? series : series ? [series] : [];
    const isEmpty =
      arr.length === 0 ||
      arr.every((s) => {
        if (!s || typeof s !== "object") return true;
        const item = s as Record<string, unknown>;
        if (item.type === "sankey") {
          const links = item.links;
          return !links || (Array.isArray(links) && links.length === 0);
        }
        const data = item.data;
        return !data || (Array.isArray(data) && data.length === 0);
      });
    if (isEmpty) return <div data-testid="chart-empty" />;
    return <div data-testid="echarts-mock">{JSON.stringify(option)}</div>;
  },
}));

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (v: number) => String(v),
}));

// Mock hooks
vi.mock("@/common/hooks/use-theme", () => ({
  useIsDarkTheme: () => false,
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

describe("CashFlowSankey", () => {
  it("should render empty state when no data provided", () => {
    render(<CashFlowSankey />);
    expect(screen.getByTestId("chart-empty")).toBeInTheDocument();
  });

  it("should render Sankey chart with income and expense data", () => {
    const incomeData = {
      account: "Income",
      balance: null,
      children: [
        { account: "Income:Salary", balance: { USD: -5000 }, children: [] },
      ],
    };

    const expensesData = {
      account: "Expenses",
      balance: null,
      children: [
        { account: "Expenses:Food", balance: { USD: 800 }, children: [] },
      ],
    };

    render(
      <CashFlowSankey
        incomeHierarchyData={incomeData}
        expensesHierarchyData={expensesData}
      />,
    );

    const chartElement = screen.getByTestId("echarts-mock");
    expect(chartElement).toBeInTheDocument();

    const optionText = chartElement.textContent;
    expect(optionText).toContain("Cash Flow");
    expect(optionText).toContain("Income:Salary");
  });

  it("reserves the chart space while account metadata is pending instead of showing heuristic output", () => {
    const assetsData = {
      account: "Assets",
      balance: null,
      children: [
        {
          account: "Assets:US:Bank:CD",
          balance: { USD: 1500 },
          children: [],
        },
      ],
    };

    render(
      <CashFlowSankey assetsHierarchyData={assetsData} accountMetaPending />,
    );

    expect(screen.getByTestId("cash-flow-sankey-pending")).toHaveTextContent(
      "page.overview.cashFlowRolesPending",
    );
    expect(screen.queryByTestId("echarts-mock")).not.toBeInTheDocument();
    expect(screen.queryByTestId("chart-empty")).not.toBeInTheDocument();
  });

  it("treats a declared cash-flow-role as authoritative over the name heuristic", () => {
    const assetsData = {
      account: "Assets",
      balance: null,
      children: [
        {
          account: "Assets:US:Bank:CD",
          balance: { USD: 1500 },
          children: [],
        },
      ],
    };

    // Heuristic alone: a `Bank` account is cash and never a flow node.
    const { rerender } = render(
      <CashFlowSankey assetsHierarchyData={assetsData} />,
    );
    expect(screen.getByTestId("chart-empty")).toBeInTheDocument();

    // Declared `investing` pulls it out of the cash set once metadata lands;
    // at the default depth it surfaces as the `Assets:US` investing node.
    rerender(
      <CashFlowSankey
        assetsHierarchyData={assetsData}
        accountMeta={
          new Map([["Assets:US:Bank:CD", { "cash-flow-role": "investing" }]])
        }
      />,
    );
    const option = JSON.parse(
      screen.getByTestId("echarts-mock").textContent ?? "{}",
    ) as { series: Array<{ links: Array<{ target: string; value: number }> }> };
    expect(option.series[0].links).toEqual([
      { source: "Cash Flow", target: "Assets:US", value: 1500 },
    ]);
  });

  it("should use specified depth for account hierarchy", () => {
    const incomeData = {
      account: "Income",
      balance: null,
      children: [
        {
          account: "Income:Salary",
          balance: null,
          children: [
            {
              account: "Income:Salary:Gross",
              balance: { USD: -5000 },
              children: [],
            },
          ],
        },
      ],
    };

    const { rerender } = render(
      <CashFlowSankey incomeHierarchyData={incomeData} depth={2} />,
    );

    let chartElement = screen.getByTestId("echarts-mock");
    expect(chartElement.textContent).toContain("Income:Salary");

    rerender(<CashFlowSankey incomeHierarchyData={incomeData} depth={3} />);

    chartElement = screen.getByTestId("echarts-mock");
    expect(chartElement.textContent).toContain("Income:Salary:Gross");
  });
});
