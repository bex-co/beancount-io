/**
 * The Sankey's edge tooltip must name the unit the chart is drawn in.
 *
 * It appended a literal " USD" to every edge, so a ledger kept in MUSD or EUR
 * was reported in dollars. The formatter lives inside the ECharts option, so
 * the option is captured and the formatter called directly.
 */
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import CashFlowSankey from "../cash-flow-sankey";

const captured: { option?: Record<string, unknown> } = {};

vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: Record<string, unknown> }) => {
    captured.option = option;
    return <div data-testid="chart" />;
  },
}));
vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (value: number) => String(value),
}));

/** The tooltip ECharts shows for an edge: it passes the link itself. */
function tooltipFor(source: string, target: string): string {
  const option = captured.option as {
    tooltip: { formatter: (params: unknown) => string };
    series: [{ links: Array<{ source: string; target: string }> }];
  };
  const link = option.series[0].links.find(
    (candidate) => candidate.source === source && candidate.target === target,
  );
  return option.tooltip
    .formatter({ dataType: "edge", data: link })
    .replace(/\s+/g, " ")
    .trim();
}

const node = (account: string, balance: Record<string, unknown>) => ({
  account,
  balance,
  children: [],
});

describe("cash flow sankey tooltips", () => {
  it("names MUSD rather than calling it USD", () => {
    render(
      <CashFlowSankey
        incomeHierarchyData={node("Income:Revenue", { MUSD: -7054 }) as never}
      />,
    );
    expect(tooltipFor("Income:Revenue", "Cash Flow")).toContain("7054 MUSD");
    expect(tooltipFor("Income:Revenue", "Cash Flow")).not.toMatch(/7054 USD/);
  });

  it("names EUR for a euro ledger", () => {
    render(
      <CashFlowSankey
        incomeHierarchyData={
          node("Income:NetRevenue", { EUR: -26328539000 }) as never
        }
      />,
    );
    expect(tooltipFor("Income:NetRevenue", "Cash Flow")).toContain("EUR");
  });

  it("still says USD for a dollar ledger", () => {
    render(
      <CashFlowSankey
        incomeHierarchyData={node("Income:Salary", { USD: -1000 }) as never}
      />,
    );
    expect(tooltipFor("Income:Salary", "Cash Flow")).toContain("1000 USD");
  });

  it("discloses the units the diagram leaves out", () => {
    const { getByText } = render(
      <CashFlowSankey
        incomeHierarchyData={node("Income:Salary", { USD: -1000 }) as never}
        expensesHierarchyData={
          {
            account: "Expenses",
            balance: null,
            children: [
              node("Expenses:Food", { USD: 400 }),
              node("Expenses:Retirement", { IRAUSD: 18000 }),
            ],
          } as never
        }
      />,
    );
    expect(
      getByText(/Balances in IRAUSD are not included/),
    ).toBeInTheDocument();
  });

  it("follows the units the accounts use, not the largest number", () => {
    // Two USD accounts against one much larger IRAUSD account: account count
    // decides, so the diagram stays in USD and says what it omits. With a
    // single account on each side the magnitude tier would pick IRAUSD
    // instead — the chooser reads the accounts, not the ledger's declared
    // operating currency, which w4/146 records as the stronger signal.
    const { getByText } = render(
      <CashFlowSankey
        incomeHierarchyData={node("Income:Salary", { USD: -1000 }) as never}
        expensesHierarchyData={
          {
            account: "Expenses",
            balance: null,
            children: [
              node("Expenses:Food", { USD: 400 }),
              node("Expenses:Retirement", { IRAUSD: 999999 }),
            ],
          } as never
        }
      />,
    );
    expect(tooltipFor("Income:Salary", "Cash Flow")).toContain("USD");
    expect(
      getByText(/Balances in IRAUSD are not included/),
    ).toBeInTheDocument();
  });
});
