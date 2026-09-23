import { render } from "@testing-library/react";
import type { EChartsOption } from "echarts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LineChart } from "@/features/reports/balance-sheet/line-chart";
import CashFlowSankey from "@/features/reports/overview/components/cash-flow-sankey";
import { parseQueryChart } from "@/features/bql/lib/chart-utils";
import LedgerCommoditiesPage from "@/features/ledger-data/commodities";
import type { QueryResultTable } from "@/graphql/definitions";

/**
 * ECharts flips a tooltip that would overflow the right edge to
 * `x - width - gap`, and only clamps that result when `confine` is set. On a
 * narrow canvas the flipped popup therefore lands at a negative x with the
 * account prefix off screen. These cases pin the option each consumer builds;
 * the placement itself was measured in a real browser, since an option
 * assertion alone cannot prove geometry.
 */

const captured: EChartsOption[] = [];

vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: EChartsOption }) => {
    captured.push(option);
    return <div data-testid="chart" />;
  },
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { renderCommas: true } } }),
}));

vi.mock("@/common/hooks/use-theme", () => ({ useIsDarkTheme: () => false }));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({
    ledgerOwner: "open_ledger",
    ledgerName: "crypto-example",
  }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite: false }),
}));

vi.mock("@/common/components/seo/ledger-page-seo", () => ({
  LedgerPageSEO: () => null,
}));

vi.mock("@/features/ledger-data/commodities/managed-price-sources", () => ({
  ManagedPriceSources: () => null,
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    loading: false,
    error: undefined,
    data: {
      getLedgerCommodities: [
        {
          base: "UNIV2ETHUSDC",
          quote: "USD",
          prices: [
            { date: "2025-09-05", value: "998.00" },
            { date: "2025-10-05", value: "1002.00" },
          ],
        },
      ],
    },
  }),
}));

beforeEach(() => {
  captured.length = 0;
});

type BoundedTooltip = { confine?: boolean; extraCssText?: string };

function tooltipOf(option: EChartsOption | undefined): BoundedTooltip {
  if (!option) throw new Error("chart was never rendered");
  return option.tooltip as BoundedTooltip;
}

/** Every consumer must keep the box inside the chart and wrap long labels. */
function expectBounded(tooltip: BoundedTooltip) {
  expect(tooltip.confine).toBe(true);
  expect(tooltip.extraCssText).toMatch(/max-width/);
  expect(tooltip.extraCssText).toMatch(/white-space:\s*normal/);
}

describe("account balance chart", () => {
  it("bounds its tooltip", () => {
    render(
      <LineChart
        data={[{ date: "2025-09", balance: { UNIV2ETHUSDC: "8.61612" } }]}
        interval="monthly"
        primarySeries="UNIV2ETHUSDC"
      />,
    );

    expectBounded(tooltipOf(captured.at(-1)));
  });

  it("keeps its own formatter alongside the bounds", () => {
    render(
      <LineChart
        data={[{ date: "2025-09", balance: { USD: "1.00" } }]}
        interval="monthly"
      />,
    );

    const tooltip = captured.at(-1)?.tooltip as { formatter?: unknown };
    expect(typeof tooltip.formatter).toBe("function");
  });
});

describe("cash flow sankey", () => {
  it("bounds its tooltip", () => {
    render(
      <CashFlowSankey
        incomeHierarchyData={{
          account: "Income",
          balance: null,
          children: [
            {
              account: "Income:NetRevenue",
              balance: { EUR: -26328539000 },
              children: [],
            },
          ],
        }}
        assetsHierarchyData={{
          account: "Assets",
          balance: null,
          children: [
            {
              account: "Assets:Current",
              balance: { EUR: 13971790000 },
              children: [],
            },
          ],
        }}
      />,
    );

    expectBounded(tooltipOf(captured.at(-1)));
  });
});

describe("commodity price chart", () => {
  it("bounds its tooltip and keeps its axis formatter", () => {
    render(<LedgerCommoditiesPage />);

    const tooltip = tooltipOf(captured.at(-1)) as BoundedTooltip & {
      trigger?: string;
      formatter?: (params: unknown) => string;
    };
    expectBounded(tooltip);
    expect(tooltip.trigger).toBe("axis");
    expect(tooltip.formatter?.([{ name: "2025-10-05" }])).toContain(
      "UNIV2ETHUSDC/USD",
    );
  });
});

describe("bql result chart", () => {
  const result = {
    types: [
      { name: "account", dtype: "str" },
      { name: "sum_number", dtype: "Decimal" },
    ],
    rows: [
      ["Assets:Crypto:Wallet:MetaMask:ETH", "4.00995"],
      ["Assets:Crypto:Coinbase:ETH", "1"],
    ],
  } as unknown as QueryResultTable;

  it("bounds its tooltip", () => {
    const config = parseQueryChart(result);

    expect(config).not.toBeNull();
    expectBounded(tooltipOf(config?.option));
  });

  it("still carries the axis trigger and plotted values", () => {
    const config = parseQueryChart(result);
    const tooltip = config?.option.tooltip as { trigger?: string };

    expect(tooltip.trigger).toBe("axis");
    expect(config?.option.series?.[0]).toMatchObject({
      data: [4.00995, 1],
    });
  });
});
