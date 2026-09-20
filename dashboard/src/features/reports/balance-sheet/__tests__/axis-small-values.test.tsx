import { render } from "@testing-library/react";
import type { EChartsOption } from "echarts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LineChart } from "../line-chart";

/**
 * The formatter is only useful if the axis actually installs it. This renders
 * the chart the Account Balance and Balance Sheet views use and runs the
 * option's own axis formatter over the ticks ECharts computed for the
 * reproduced 0.04 BTC holding.
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

vi.mock("@/common/hooks/use-format-quantity", () => ({
  useFormatQuantity: () => (value: number) => String(value),
}));

vi.mock("@/common/hooks/use-theme", () => ({ useIsDarkTheme: () => false }));

beforeEach(() => {
  captured.length = 0;
});

function axisFormatter() {
  const option = captured.at(-1);
  if (!option) throw new Error("chart was never rendered");
  const yAxis = option.yAxis as {
    axisLabel: { formatter: (value: number) => string };
  };
  return yAxis.axisLabel.formatter;
}

describe("balance line chart axis labels", () => {
  it("renders the fractional BTC ticks as distinct values", () => {
    render(
      <LineChart
        data={[
          { date: "2025-03-31", balance: { BTC: "0.004" } },
          { date: "2025-12-31", balance: { BTC: "0.040" } },
        ]}
        interval="monthly"
        primarySeries="BTC"
      />,
    );

    const format = axisFormatter();
    const ticks = [0, 0.01, 0.02, 0.03, 0.04].map(format);

    expect(ticks).toEqual(["0.0", "0.01", "0.02", "0.03", "0.04"]);
    // The failure this replaces: every one of them read "0.0".
    expect(ticks.filter((tick) => tick === "0.0")).toHaveLength(1);
  });

  it("still abbreviates a large-currency axis", () => {
    render(
      <LineChart
        data={[{ date: "2025-12-31", balance: { USD: "4500" } }]}
        interval="monthly"
        primarySeries="USD"
      />,
    );

    const format = axisFormatter();
    expect([0, 1000, 4500].map(format)).toEqual(["0.0", "1.0k", "4.5k"]);
  });
});
