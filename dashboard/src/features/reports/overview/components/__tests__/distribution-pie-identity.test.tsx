import { render } from "@testing-library/react";
import type { EChartsOption } from "echarts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DistributionPie } from "../distribution-chart/distribution-pie";
import type { DistributionItem } from "../distribution-chart/utils";

/**
 * Leaf account names repeat across parents — a crypto ledger can hold USD at
 * two exchanges, and BTC at three. Slices stay labelled by the short name so
 * they do not overflow, so the tooltip is the only thing that can tell those
 * slices apart.
 */

const captured: EChartsOption[] = [];

vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: EChartsOption }) => {
    captured.push(option);
    return <div data-testid="echarts" />;
  },
}));

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (value: number) => value.toLocaleString("en-US"),
}));

vi.mock("@/common/hooks/use-theme", () => ({ useIsDarkTheme: () => false }));

const items: DistributionItem[] = [
  { name: "Assets:Crypto:Coinbase:USD", label: "USD", value: 38313.69 },
  { name: "Assets:Crypto:Binance:USD", label: "USD", value: 5675.89 },
  { name: "Assets:Crypto:Coinbase:BTC", label: "BTC", value: 13863.779 },
  { name: "Other", label: "Other", value: 2001.16 },
];

type PieDatum = { name: string; value: number; account?: string };

function lastOption() {
  const option = captured.at(-1);
  if (!option) throw new Error("chart was never rendered");
  return option;
}

function pieData(): PieDatum[] {
  const series = Array.isArray(lastOption().series)
    ? lastOption().series
    : [lastOption().series];
  return (series as Array<{ data: PieDatum[] }>)[0].data;
}

function tooltipFor(datum: PieDatum, percent: number) {
  const tooltip = lastOption().tooltip as {
    formatter: (params: unknown) => string;
  };
  // The shape ECharts passes a pie tooltip formatter.
  return tooltip.formatter({
    name: datum.name,
    value: datum.value,
    percent,
    data: datum,
  });
}

beforeEach(() => {
  captured.length = 0;
});

describe("DistributionPie account identity", () => {
  it("tells apart two slices that share a leaf name", () => {
    render(<DistributionPie title="Assets Distribution" items={items} />);

    const data = pieData();
    expect(tooltipFor(data[0], 19.71)).toBe(
      "Assets:Crypto:Coinbase:USD: 38,313.69 (19.71%)",
    );
    expect(tooltipFor(data[1], 2.92)).toBe(
      "Assets:Crypto:Binance:USD: 5,675.89 (2.92%)",
    );
    expect(tooltipFor(data[2], 7.13)).toBe(
      "Assets:Crypto:Coinbase:BTC: 13,863.779 (7.13%)",
    );
  });

  it("keeps slice labels short so narrow slices do not overflow", () => {
    render(<DistributionPie title="Assets Distribution" items={items} />);

    // The drawn label uses {b}, which is the datum's name.
    expect(pieData().map((d) => d.name)).toEqual([
      "USD",
      "USD",
      "BTC",
      "Other",
    ]);
    const series = (
      Array.isArray(lastOption().series)
        ? lastOption().series
        : [lastOption().series]
    ) as Array<{ label: { formatter: string } }>;
    expect(series[0].label.formatter).toBe("{b}: {d}%");
  });

  it("keeps the aggregated Other bucket meaningful", () => {
    render(<DistributionPie title="Assets Distribution" items={items} />);
    expect(tooltipFor(pieData()[3], 1.03)).toBe("Other: 2,001.16 (1.03%)");
  });

  it("names a single account when the pie holds one slice", () => {
    render(
      <DistributionPie
        title="Assets Distribution"
        items={[
          { name: "Assets:Bank:Checking", label: "Checking", value: 68033 },
        ]}
      />,
    );
    expect(tooltipFor(pieData()[0], 100)).toBe(
      "Assets:Bank:Checking: 68,033 (100%)",
    );
  });
});
