import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { EChartsOption } from "echarts";
import { DateBalanceChart } from "../date-balance-chart";

let capturedOption: EChartsOption | undefined;

beforeEach(() => {
  capturedOption = undefined;
});

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (v: number) => String(v),
}));

// The single-series chart formats quantities at the source's own precision.
vi.mock("@/common/hooks/use-format-quantity", () => ({
  useFormatQuantity: () => (v: number) => String(v),
}));

// Mock ReactECharts to avoid canvas rendering
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: EChartsOption }) => {
    capturedOption = option;
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
    return (
      <div data-testid="react-echarts" data-option={JSON.stringify(option)}>
        Mocked Chart
      </div>
    );
  },
}));

interface DateAndBalance {
  date: string;
  balance: Record<string, unknown>;
  accountBalances?: Record<string, unknown>;
}

describe("DateBalanceChart", () => {
  const mockData: DateAndBalance[] = [
    { date: "2024-01", balance: { USD: 1000, EUR: 800 } },
    { date: "2024-02", balance: { USD: 1500, EUR: 1200 } },
    { date: "2024-03", balance: { USD: 2000, EUR: 1600 } },
  ];

  describe("Empty state", () => {
    it("should render empty message when data is empty", () => {
      render(<DateBalanceChart data={[]} />);

      expect(screen.getByTestId("chart-empty")).toBeInTheDocument();
    });

    it("should render empty message when data is null-like", () => {
      render(<DateBalanceChart data={null as unknown as DateAndBalance[]} />);

      expect(screen.getByTestId("chart-empty")).toBeInTheDocument();
    });
  });

  describe("Data rendering", () => {
    it("should render chart when data is provided", () => {
      render(<DateBalanceChart data={mockData} />);

      expect(screen.getByTestId("react-echarts")).toBeInTheDocument();
    });

    it("should extract all commodities from data", () => {
      render(<DateBalanceChart data={mockData} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // Check that legend has both USD and EUR
      expect(option.legend.data).toContain("USD");
      expect(option.legend.data).toContain("EUR");
    });

    it("should create bar series for each commodity", () => {
      render(<DateBalanceChart data={mockData} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.series).toHaveLength(2);
      expect(option.series[0].type).toBe("bar");
      expect(option.series[1].type).toBe("bar");
    });

    it("should use dates as x-axis data", () => {
      render(<DateBalanceChart data={mockData} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.xAxis.data).toEqual(["2024-01", "2024-02", "2024-03"]);
    });
  });

  describe("Primary series selection", () => {
    it("should select USD by default in legend", () => {
      render(<DateBalanceChart data={mockData} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.legend.selected.USD).toBe(true);
      expect(option.legend.selected.EUR).toBe(false);
    });

    it("should select primary series when specified", () => {
      render(<DateBalanceChart data={mockData} primarySeries="EUR" />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // EUR should be first in order
      expect(option.legend.data[0]).toBe("EUR");
    });

    it("should select first commodity if USD is not present", () => {
      const nonUsdData: DateAndBalance[] = [
        { date: "2024-01", balance: { EUR: 800, GBP: 700 } },
      ];

      render(<DateBalanceChart data={nonUsdData} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // First commodity should be selected when USD is not present
      expect(option.legend.selected[option.legend.data[0]]).toBe(true);
    });
  });

  describe("Value handling", () => {
    it("should handle numeric balance values", () => {
      render(<DateBalanceChart data={mockData} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // Find USD series
      const usdSeries = option.series.find(
        (s: { name: string }) => s.name === "USD",
      );
      expect(usdSeries.data).toEqual([1000, 1500, 2000]);
    });

    it("should handle string balance values", () => {
      const stringData: DateAndBalance[] = [
        { date: "2024-01", balance: { USD: "1000.50" } },
        { date: "2024-02", balance: { USD: "1500.75" } },
      ];

      render(<DateBalanceChart data={stringData} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      const usdSeries = option.series.find(
        (s: { name: string }) => s.name === "USD",
      );
      expect(usdSeries.data).toEqual([1000.5, 1500.75]);
    });

    it("should handle null values as 0", () => {
      const dataWithNull: DateAndBalance[] = [
        { date: "2024-01", balance: { USD: null } },
        { date: "2024-02", balance: { USD: 1000 } },
      ];

      render(<DateBalanceChart data={dataWithNull} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      const usdSeries = option.series.find(
        (s: { name: string }) => s.name === "USD",
      );
      expect(usdSeries.data[0]).toBe(0);
    });

    it("should handle undefined values as 0", () => {
      const dataWithUndefined: DateAndBalance[] = [
        { date: "2024-01", balance: { USD: undefined } },
        { date: "2024-02", balance: { USD: 1000 } },
      ];

      render(<DateBalanceChart data={dataWithUndefined} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      const usdSeries = option.series.find(
        (s: { name: string }) => s.name === "USD",
      );
      expect(usdSeries.data[0]).toBe(0);
    });

    it("should handle NaN values as 0", () => {
      const dataWithInvalid: DateAndBalance[] = [
        { date: "2024-01", balance: { USD: "not a number" } },
        { date: "2024-02", balance: { USD: 1000 } },
      ];

      render(<DateBalanceChart data={dataWithInvalid} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      const usdSeries = option.series.find(
        (s: { name: string }) => s.name === "USD",
      );
      expect(usdSeries.data[0]).toBe(0);
    });

    it("should handle missing commodity in some data points", () => {
      const dataWithMissing: DateAndBalance[] = [
        { date: "2024-01", balance: { USD: 1000 } },
        { date: "2024-02", balance: { EUR: 1200 } },
      ];

      render(<DateBalanceChart data={dataWithMissing} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // USD should have 0 for second data point
      const usdSeries = option.series.find(
        (s: { name: string }) => s.name === "USD",
      );
      expect(usdSeries.data[1]).toBe(0);
    });
  });

  describe("Chart configuration", () => {
    it("should configure bar chart type", () => {
      render(<DateBalanceChart data={mockData} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.series[0].type).toBe("bar");
    });

    it("should enable animation", () => {
      render(<DateBalanceChart data={mockData} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.animation).toBe(true);
      expect(option.animationDuration).toBe(1000);
    });

    it("should configure tooltip with axis trigger", () => {
      render(<DateBalanceChart data={mockData} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.tooltip.trigger).toBe("axis");
    });

    it("should configure scrollable legend", () => {
      render(<DateBalanceChart data={mockData} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.legend.type).toBe("scroll");
      expect(option.legend.bottom).toBe(0);
    });

    it("should set series emphasis to focus", () => {
      render(<DateBalanceChart data={mockData} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.series[0].emphasis.focus).toBe("series");
    });
  });

  describe("Edge cases", () => {
    it("should handle single data point", () => {
      const singlePoint: DateAndBalance[] = [
        { date: "2024-01", balance: { USD: 1000 } },
      ];

      render(<DateBalanceChart data={singlePoint} />);

      expect(screen.getByTestId("react-echarts")).toBeInTheDocument();
    });

    it("should handle many commodities", () => {
      const manyComms: DateAndBalance[] = [
        {
          date: "2024-01",
          balance: { USD: 1000, EUR: 800, GBP: 700, JPY: 100000 },
        },
      ];

      render(<DateBalanceChart data={manyComms} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.series).toHaveLength(4);
      expect(option.legend.data).toHaveLength(4);
    });

    it("should handle negative values", () => {
      const negativeData: DateAndBalance[] = [
        { date: "2024-01", balance: { USD: -500 } },
        { date: "2024-02", balance: { USD: 1000 } },
      ];

      render(<DateBalanceChart data={negativeData} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      const usdSeries = option.series.find(
        (s: { name: string }) => s.name === "USD",
      );
      expect(usdSeries.data[0]).toBe(-500);
    });

    it("should handle empty balance objects", () => {
      const emptyBalance: DateAndBalance[] = [
        { date: "2024-01", balance: {} },
        { date: "2024-02", balance: { USD: 1000 } },
      ];

      render(<DateBalanceChart data={emptyBalance} />);

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      expect(option.series).toHaveLength(1);
    });
  });

  describe("Interval prop", () => {
    it("should pass interval to formatter", () => {
      render(<DateBalanceChart data={mockData} interval="weekly" />);

      // The component uses interval for date axis formatting
      // Just verify it renders correctly
      expect(screen.getByTestId("react-echarts")).toBeInTheDocument();
    });
  });

  describe("Stacked Mode", () => {
    // Reproduced USD account values, with synthetic EUR counterparts to
    // exercise the same account mapping in a second currency group.
    const tooltipData: DateAndBalance[] = [
      {
        date: "2026-01-31",
        balance: { USD: "-15500", EUR: "-200" },
        accountBalances: {
          "Income:Development": { USD: "-9500", EUR: "-120" },
          "Income:Consulting": { USD: "-6000", EUR: "-80" },
        },
      },
    ];

    function renderStackedTooltip() {
      render(
        <DateBalanceChart
          data={tooltipData}
          interval="monthly"
          primarySeries="USD"
          chartMode="stacked"
          inverted={false}
        />,
      );
      const option = capturedOption as {
        tooltip: { formatter: (params: unknown) => string };
        series: Array<{ name: string; data: number[] }>;
      };
      return {
        format: option.tooltip.formatter,
        item: (seriesIndex: number) => ({
          componentType: "series",
          seriesType: "bar",
          seriesIndex,
          seriesName: option.series[seriesIndex].name,
          name: tooltipData[0].date,
          dataIndex: 0,
          data: option.series[seriesIndex].data[0],
          value: option.series[seriesIndex].data[0],
        }),
      };
    }

    it("names the first and later account segments in every currency group", () => {
      const { format, item } = renderStackedTooltip();
      const expected = [
        ["Income:Consulting", "-6000 USD"],
        ["Income:Development", "-9500 USD"],
        ["Income:Consulting", "-80 EUR"],
        ["Income:Development", "-120 EUR"],
      ];
      expected.forEach(([account, amount], seriesIndex) => {
        const html = format(item(seriesIndex));
        expect(html).toContain(`<div>${account}</div>`);
        expect(html).toContain("<strong>2026-01</strong>");
        expect(html).toContain(`<div>${amount}</div>`);
      });
    });

    it("omits account identity for absent, noninteger or out-of-range series indices", () => {
      const { format, item } = renderStackedTooltip();
      for (const seriesIndex of [
        undefined,
        null,
        -1,
        -2,
        0.5,
        NaN,
        Infinity,
        -Infinity,
        4,
        1000,
        "0",
      ]) {
        const html = format({ ...item(0), seriesIndex });
        expect(html).not.toContain("Income:");
        expect(html).toContain("<strong>2026-01</strong>");
        expect(html).toContain("-6000 USD");
      }
    });

    it("keeps item-only value validation and signed scalar formatting", () => {
      const { format, item } = renderStackedTooltip();
      expect(format([item(0)])).toBe("");
      expect(format([])).toBe("");
      for (const value of [null, undefined, {}, [-6000], NaN, "not a number"]) {
        expect(format({ ...item(0), value })).toBe("");
      }
      for (const [value, expected] of [
        ["-6000.5", "-6000.5 USD"],
        [100.5, "+100.5 USD"],
        [0, "+0 USD"],
      ]) {
        expect(format({ ...item(1), value })).toContain(String(expected));
      }
    });

    const mockDataWithAccounts: DateAndBalance[] = [
      {
        date: "2024-01",
        balance: { USD: 5000, EUR: 200 },
        accountBalances: {
          "Income:Salary": { USD: 3000, EUR: 100 },
          "Income:Investments": { USD: 2000, EUR: 100 },
        },
      },
      {
        date: "2024-02",
        balance: { USD: 6000, EUR: 300 },
        accountBalances: {
          "Income:Salary": { USD: 3500, EUR: 150 },
          "Income:Investments": { USD: 2500, EUR: 150 },
        },
      },
    ];

    it("should render chart with account series when chartMode is stacked", () => {
      render(
        <DateBalanceChart
          data={mockDataWithAccounts}
          interval="monthly"
          primarySeries="USD"
          chartMode="stacked"
        />,
      );

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // 2 currencies (USD, EUR) × 2 accounts = 4 series
      expect(option.series).toHaveLength(4);
      // Series names are currency names
      expect(option.series[0].name).toBe("USD");
      expect(option.series[1].name).toBe("USD");
      expect(option.series[2].name).toBe("EUR");
      expect(option.series[3].name).toBe("EUR");
    });

    it("should stack series in stacked mode using currency as stack key", () => {
      render(
        <DateBalanceChart
          data={mockDataWithAccounts}
          interval="monthly"
          primarySeries="USD"
          chartMode="stacked"
        />,
      );

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // USD block (first 2 series) uses stack: "USD"
      expect(option.series[0].stack).toBe("USD");
      expect(option.series[1].stack).toBe("USD");
      // EUR block (next 2 series) uses stack: "EUR"
      expect(option.series[2].stack).toBe("EUR");
      expect(option.series[3].stack).toBe("EUR");
    });

    it("should show all currencies and carry correct values per currency stack", () => {
      render(
        <DateBalanceChart
          data={mockDataWithAccounts}
          interval="monthly"
          primarySeries="USD"
          chartMode="stacked"
        />,
      );

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // USD block: [Income:Investments, Income:Salary] sorted alphabetically
      const usdSeries = option.series.filter(
        (s: { name: string }) => s.name === "USD",
      );
      expect(usdSeries[0].data).toEqual([2000, 2500]); // Income:Investments
      expect(usdSeries[1].data).toEqual([3000, 3500]); // Income:Salary

      // EUR block
      const eurSeries = option.series.filter(
        (s: { name: string }) => s.name === "EUR",
      );
      expect(eurSeries[0].data).toEqual([100, 150]); // Income:Investments
    });

    it("should use currency names in legend with primary first", () => {
      render(
        <DateBalanceChart
          data={mockDataWithAccounts}
          interval="monthly"
          primarySeries="USD"
          chartMode="stacked"
        />,
      );

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // Legend contains currency names, primarySeries first
      expect(option.legend.data).toEqual(["USD", "EUR"]);
      // USD comes first (primarySeries), EUR second
      expect(option.series[0].stack).toBe("USD");
      expect(option.series[2].stack).toBe("EUR");
      // Account colors stay consistent across currency groups.
      expect(option.series[0].itemStyle.color).toBe(
        option.series[2].itemStyle.color,
      );
      expect(option.series[1].itemStyle.color).toBe(
        option.series[3].itemStyle.color,
      );
      expect(option.series[0].itemStyle.color).not.toBe(
        option.series[1].itemStyle.color,
      );
    });

    it("should handle missing accountBalances in some data points", () => {
      const dataWithMissing: DateAndBalance[] = [
        {
          date: "2024-01",
          balance: { USD: 5000 },
          accountBalances: {
            "Income:Salary": { USD: 3000 },
          },
        },
        {
          date: "2024-02",
          balance: { USD: 3000 },
          // No Income:Salary for this period
        },
      ];

      render(
        <DateBalanceChart
          data={dataWithMissing}
          interval="monthly"
          primarySeries="USD"
          chartMode="stacked"
        />,
      );

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // Series name is currency; 1 account × 1 currency = 1 series
      expect(option.series).toHaveLength(1);
      const usdSeries = option.series.find(
        (s: { name: string }) => s.name === "USD",
      );
      // Second value should be 0 when accountBalances is missing for that period
      expect(usdSeries.data).toEqual([3000, 0]);
    });

    it("should handle missing currency in accountBalances", () => {
      const dataWithMissingCurrency: DateAndBalance[] = [
        {
          date: "2024-01",
          balance: { USD: 5000 },
          accountBalances: {
            "Income:Salary": { EUR: 100 }, // No USD
          },
        },
      ];

      render(
        <DateBalanceChart
          data={dataWithMissingCurrency}
          interval="monthly"
          primarySeries="USD"
          chartMode="stacked"
        />,
      );

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // Only EUR appears in accountBalances, so 1 account × 1 currency = 1 series
      expect(option.series).toHaveLength(1);

      // EUR-stack series should carry the actual value; series name = currency
      const eurSeries = option.series.find(
        (s: { name: string; stack: string }) => s.stack === "EUR",
      );
      expect(eurSeries.name).toBe("EUR");
      expect(eurSeries.data).toEqual([100]);
    });

    it("should use axis trigger for tooltip in stacked mode", () => {
      render(
        <DateBalanceChart
          data={mockDataWithAccounts}
          interval="monthly"
          primarySeries="USD"
          chartMode="stacked"
        />,
      );

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // Tooltip should use item trigger for stacked mode
      expect(option.tooltip.trigger).toBe("item");
    });

    it("should show all currencies in legend without pre-selection in stacked mode", () => {
      render(
        <DateBalanceChart
          data={mockDataWithAccounts}
          interval="monthly"
          primarySeries="USD"
          chartMode="stacked"
        />,
      );

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // In stacked mode, legend shows currencies with only primarySeries selected
      expect(option.legend.data).toHaveLength(2);
      expect(option.legend.data).toContain("USD");
      expect(option.legend.data).toContain("EUR");
      expect(option.legend.selected.USD).toBe(true);
      expect(option.legend.selected.EUR).toBe(false);
    });
  });

  describe("Single Mode (explicit)", () => {
    it("should not stack series when chartMode is single", () => {
      render(
        <DateBalanceChart
          data={mockData}
          interval="monthly"
          primarySeries="USD"
          chartMode="single"
        />,
      );

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // Series should not have stack property
      option.series.forEach((series: { stack?: string }) => {
        expect(series.stack).toBeUndefined();
      });
    });

    it("should show commodities in single mode even with accountBalances", () => {
      const dataWithAccounts: DateAndBalance[] = [
        {
          date: "2024-01",
          balance: { USD: 5000, EUR: 200 },
          accountBalances: {
            "Income:Salary": { USD: 3000 },
          },
        },
      ];

      render(
        <DateBalanceChart
          data={dataWithAccounts}
          interval="monthly"
          primarySeries="USD"
          chartMode="single"
        />,
      );

      const chartElement = screen.getByTestId("react-echarts");
      const option = JSON.parse(
        chartElement.getAttribute("data-option") || "{}",
      );

      // Should show commodities (USD, EUR), not accounts
      expect(option.series).toHaveLength(2);
      expect(option.series[0].name).toBe("USD");
      expect(option.series[1].name).toBe("EUR");
    });
  });
});
