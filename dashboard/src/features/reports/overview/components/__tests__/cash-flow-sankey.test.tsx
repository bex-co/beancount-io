import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CashFlowSankey from "../cash-flow-sankey";
import {
  SANKEY_CASH_NODE,
  SANKEY_HUB_NODE,
} from "../../lib/sankey-data-transformer";
import {
  buildCashFlowStatement,
  type AccountMetaMap,
  type IntervalAccountChanges,
} from "@/features/reports/cash-flow/lib/model";

vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: unknown }) => {
    const opt = option as {
      tooltip: { formatter: (params: unknown) => string };
      series: Array<{
        links: Array<{ source: string; target: string; value: number }>;
        label: { formatter: (params: unknown) => string };
      }>;
    };
    const firstLink = opt.series[0].links[0];
    return (
      <div data-testid="echarts-mock">
        <span data-testid="echarts-option">{JSON.stringify(option)}</span>
        {/* Formatters are functions and do not survive JSON, so render their
            output for the tooltip and label assertions. */}
        <span data-testid="tooltip-sample">
          {opt.tooltip.formatter({ dataType: "edge", data: firstLink })}
        </span>
        <span data-testid="label-samples">
          {opt.series[0].links
            .flatMap((link) => [link.source, link.target])
            .map((name) => opt.series[0].label.formatter({ name }))
            .join("|")}
        </span>
      </div>
    );
  },
}));

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (v: number) => String(v),
}));

vi.mock("@/common/hooks/use-theme", () => ({
  useIsDarkTheme: () => false,
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    // Echo the key plus its interpolations so assertions can see both.
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));

function statementFrom(
  intervals: IntervalAccountChanges[],
  accountMeta?: AccountMetaMap,
) {
  return buildCashFlowStatement({
    intervals,
    closingCashAccounts: [],
    primaryCurrency: "USD",
    accountMeta,
  });
}

function linksOf(): Array<{ source: string; target: string; value: number }> {
  const option = JSON.parse(
    screen.getByTestId("echarts-option").textContent ?? "{}",
  ) as {
    series: Array<{
      links: Array<{ source: string; target: string; value: number }>;
    }>;
  };
  return option.series[0].links;
}

describe("CashFlowSankey", () => {
  it("shows the empty state when there is no statement yet", () => {
    render(<CashFlowSankey primaryCurrency="USD" />);

    expect(screen.getByTestId("cash-flow-sankey-empty")).toHaveTextContent(
      "page.overview.cashFlowNoFlows",
    );
    expect(screen.queryByTestId("echarts-mock")).not.toBeInTheDocument();
  });

  it("draws income into the hub and expenses out of it", () => {
    const statement = statementFrom([
      {
        date: "2026-01-01",
        accountChanges: {
          "Income:Salary": { USD: "-5000.00" },
          "Expenses:Food": { USD: "800.00" },
        },
      },
    ]);

    render(<CashFlowSankey statement={statement} primaryCurrency="USD" />);

    expect(linksOf()).toEqual(
      expect.arrayContaining([
        { source: "Income:Salary", target: SANKEY_HUB_NODE, value: 5000 },
        { source: SANKEY_HUB_NODE, target: "Expenses:Food", value: 800 },
        { source: SANKEY_HUB_NODE, target: SANKEY_CASH_NODE, value: 4200 },
      ]),
    );
  });

  it("reserves the chart space while the data is pending instead of showing provisional output", () => {
    render(<CashFlowSankey primaryCurrency="USD" pending />);

    expect(screen.getByTestId("cash-flow-sankey-pending")).toHaveTextContent(
      "page.overview.cashFlowRolesPending",
    );
    expect(screen.queryByTestId("echarts-mock")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("cash-flow-sankey-empty"),
    ).not.toBeInTheDocument();
  });

  it("treats a declared cash-flow-role as authoritative over the name heuristic", () => {
    const intervals: IntervalAccountChanges[] = [
      {
        date: "2026-01-01",
        accountChanges: {
          "Income:Salary": { USD: "-1500.00" },
          "Assets:US:Bank:CD": { USD: "1500.00" },
        },
      },
    ];

    // Heuristic alone: a `Bank` account is cash and never a flow node, so the
    // salary lands in the cash node instead.
    const { rerender } = render(
      <CashFlowSankey
        statement={statementFrom(intervals)}
        primaryCurrency="USD"
      />,
    );
    expect(linksOf()).toEqual([
      { source: "Income:Salary", target: SANKEY_HUB_NODE, value: 1500 },
      { source: SANKEY_HUB_NODE, target: SANKEY_CASH_NODE, value: 1500 },
    ]);

    // Declared `investing` pulls it out of the cash set; at the default depth
    // it surfaces as the `Assets:US` investing node and the cash node goes.
    rerender(
      <CashFlowSankey
        statement={statementFrom(
          intervals,
          new Map([["Assets:US:Bank:CD", { "cash-flow-role": "investing" }]]),
        )}
        primaryCurrency="USD"
      />,
    );
    expect(linksOf()).toEqual([
      { source: "Income:Salary", target: SANKEY_HUB_NODE, value: 1500 },
      { source: SANKEY_HUB_NODE, target: "Assets:US", value: 1500 },
    ]);
  });

  it("uses the requested depth for account nodes", () => {
    const statement = statementFrom([
      {
        date: "2026-01-01",
        accountChanges: { "Income:Salary:Gross": { USD: "-5000.00" } },
      },
    ]);

    const { rerender } = render(
      <CashFlowSankey statement={statement} primaryCurrency="USD" depth={2} />,
    );
    expect(linksOf()[0].source).toBe("Income:Salary");

    rerender(
      <CashFlowSankey statement={statement} primaryCurrency="USD" depth={3} />,
    );
    expect(linksOf()[0].source).toBe("Income:Salary:Gross");
  });

  it("prices the tooltip in the presentation currency, not a hardcoded USD", () => {
    const statement = statementFrom([
      {
        date: "2026-01-01",
        accountChanges: { "Income:Salary": { EUR: "-5000.00" } },
      },
    ]);

    render(<CashFlowSankey statement={statement} primaryCurrency="EUR" />);

    const tooltip = screen.getByTestId("tooltip-sample").textContent ?? "";
    expect(tooltip).toContain("5000 EUR");
    expect(tooltip).not.toContain("USD");
  });

  it("translates the hub and cash node labels instead of rendering their ids", () => {
    const statement = statementFrom([
      {
        date: "2026-01-01",
        accountChanges: {
          "Income:Salary": { USD: "-5000.00" },
          "Expenses:Food": { USD: "800.00" },
        },
      },
    ]);

    render(<CashFlowSankey statement={statement} primaryCurrency="USD" />);

    const labels = screen.getByTestId("label-samples").textContent ?? "";
    expect(labels).toContain("page.overview.cashFlow");
    expect(labels).toContain("page.overview.cashFlowToCash");
    expect(labels).not.toContain(SANKEY_HUB_NODE);
    expect(labels).not.toContain(SANKEY_CASH_NODE);
  });

  it("discloses units that have no price to the presentation currency", () => {
    const statement = statementFrom([
      {
        date: "2026-01-01",
        accountChanges: {
          "Income:Salary": { USD: "-5000.00", TRY: "-20000.00" },
          "Assets:Crypto:USDT": { USDT: "100.00" },
        },
      },
    ]);

    render(<CashFlowSankey statement={statement} primaryCurrency="USD" />);

    expect(screen.getByText(/cashFlowUnshownUnits/)).toHaveTextContent(
      "TRY, USDT",
    );
  });

  it("shows the disclosure with the empty state when nothing converts", () => {
    const statement = statementFrom([
      {
        date: "2026-01-01",
        accountChanges: { "Income:Salary": { TRY: "-20000.00" } },
      },
    ]);

    render(<CashFlowSankey statement={statement} primaryCurrency="USD" />);

    const empty = screen.getByTestId("cash-flow-sankey-empty");
    expect(empty).toHaveTextContent("page.overview.cashFlowNoFlows");
    expect(empty).toHaveTextContent("TRY");
  });
});
