import { render } from "@testing-library/react";
import type { EChartsOption } from "echarts";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { LineChart } from "../line-chart";

/**
 * The Balance Sheet chart labels a reporting point by its own civil day in
 * every browser zone (w4/1028): Kiritimati skipped 1994-12-31, and a local
 * midnight that day labeled the December point January / Q1 / 1995.
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
vi.mock("@/common/hooks/use-theme", () => ({ useIsDarkTheme: () => false }));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { renderCommas: true } } }),
}));

const originalTz = process.env.TZ;
beforeAll(() => {
  process.env.TZ = "Pacific/Kiritimati";
});
afterAll(() => {
  process.env.TZ = originalTz;
});

const POINTS = [
  { date: "1994-11-30", balance: { USD: "10" } },
  { date: "1994-12-31", balance: { USD: "20" } },
];

describe("Balance Sheet chart labels in Pacific/Kiritimati", () => {
  it.each([
    ["monthly", "1994-12"],
    ["quarterly", "1994-Q4"],
    ["yearly", "1994"],
  ] as const)("labels the 1994-12-31 point %s as %s", (interval, label) => {
    captured.length = 0;
    render(<LineChart data={POINTS} interval={interval} primarySeries="USD" />);
    const option = captured.at(-1)!;
    const axis = (
      option.xAxis as { axisLabel: { formatter: (value: string) => string } }
    ).axisLabel.formatter;
    expect(axis("1994-12-31")).toBe(label);
    const tooltip = (
      option.tooltip as { formatter: (params: unknown[]) => string }
    ).formatter([
      {
        name: "1994-12-31",
        seriesName: "USD",
        color: "#000",
        value: ["1994-12-31", 20],
      },
    ]);
    expect(tooltip).toContain(label);
    expect(tooltip).not.toContain("1995");
  });
});
