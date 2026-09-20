import { render } from "@testing-library/react";
import type { EChartsOption } from "echarts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LineChart } from "@/features/reports/balance-sheet/line-chart";
import { SingleDateBalanceChart } from "@/features/reports/income-statement/date-balance-chart/single-date-balance-chart";

/**
 * A tooltip is the detailed readout, so it has to agree with the journal below
 * it. Both charts used the cash formatter, which caps at three fraction
 * digits: 4.00995 ETH read as 4.01 while the journal showed the real quantity.
 * These cases run each chart's own tooltip formatter through the real
 * `formatQuantity`, with the params shape ECharts passes it.
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

// Real formatter, real render_commas default — only the provider is stubbed.
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { renderCommas: true } } }),
}));

vi.mock("@/common/hooks/use-theme", () => ({ useIsDarkTheme: () => false }));

beforeEach(() => {
  captured.length = 0;
});

type Formatter = (params: unknown) => string;

function tooltipFormatter(): Formatter {
  const option = captured.at(-1);
  if (!option) throw new Error("chart was never rendered");
  const tooltip = option.tooltip as { formatter: Formatter };
  return tooltip.formatter;
}

/** Strips the markup so a case asserts on what a reader actually sees. */
const text = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const ETH_BALANCES = [
  { date: "2026-04", balance: { ETH: "2" } },
  { date: "2026-05", balance: { ETH: "4.00995" } },
];

describe("account balance tooltip", () => {
  function renderAndFormat(
    data: Array<{ date: string; balance: Record<string, string> }>,
    point: { date: string; series: string; value: number },
  ) {
    render(<LineChart data={data} interval="monthly" primarySeries="ETH" />);
    return text(
      tooltipFormatter()([
        {
          name: point.date,
          seriesName: point.series,
          value: [point.date, point.value],
          color: "#000",
        },
      ]),
    );
  }

  it("reports the reproduced ETH balance in full", () => {
    expect(
      renderAndFormat(ETH_BALANCES, {
        date: "2026-05",
        series: "ETH",
        value: 4.00995,
      }),
    ).toContain("4.00995");
  });

  it("does not round it to the cash formatter's three digits", () => {
    const out = renderAndFormat(ETH_BALANCES, {
      date: "2026-05",
      series: "ETH",
      value: 4.00995,
    });
    expect(out).not.toMatch(/\b4\.01\b/);
  });

  it("leaves a whole quantity without invented decimals", () => {
    expect(
      renderAndFormat(ETH_BALANCES, {
        date: "2026-04",
        series: "ETH",
        value: 2,
      }),
    ).toMatch(/ETH: 2\b/);
  });

  it("keeps an ordinary USD balance in its usual shape", () => {
    expect(
      renderAndFormat([{ date: "2026-05", balance: { USD: "6903.12" } }], {
        date: "2026-05",
        series: "USD",
        value: 6903.12,
      }),
    ).toContain("6,903.12");
  });

  it("keeps a small fractional holding", () => {
    expect(
      renderAndFormat([{ date: "2026-05", balance: { BTC: "0.004" } }], {
        date: "2026-05",
        series: "BTC",
        value: 0.004,
      }),
    ).toContain("0.004");
  });
});

describe("changes over time tooltip", () => {
  const ETH_CHANGES = [
    { date: "2025-08", balance: { ETH: "-1.5" } },
    { date: "2026-05", balance: { ETH: "2.00995" } },
  ];

  function renderAndFormat(
    data: Array<{ date: string; balance: Record<string, string> }>,
    point: { date: string; series: string; value: number },
  ) {
    render(
      <SingleDateBalanceChart
        data={data}
        interval="monthly"
        primarySeries="ETH"
      />,
    );
    return text(
      tooltipFormatter()([
        {
          name: point.date,
          seriesName: point.series,
          value: point.value,
          color: "#000",
        },
      ]),
    );
  }

  it("reports the reproduced ETH change in full, with its sign", () => {
    expect(
      renderAndFormat(ETH_CHANGES, {
        date: "2026-05",
        series: "ETH",
        value: 2.00995,
      }),
    ).toContain("+2.00995");
  });

  it("does not round it to the cash formatter's three digits", () => {
    const out = renderAndFormat(ETH_CHANGES, {
      date: "2026-05",
      series: "ETH",
      value: 2.00995,
    });
    expect(out).not.toMatch(/\+2\.01\b/);
  });

  it("keeps a negative change negative", () => {
    expect(
      renderAndFormat(ETH_CHANGES, {
        date: "2025-08",
        series: "ETH",
        value: -1.5,
      }),
    ).toContain("-1.5");
  });

  it("still shows a zero change as +0", () => {
    expect(
      renderAndFormat([{ date: "2026-06", balance: { ETH: "0" } }], {
        date: "2026-06",
        series: "ETH",
        value: 0,
      }),
    ).toContain("+0");
  });

  it("keeps an ordinary USD change in its usual shape", () => {
    expect(
      renderAndFormat([{ date: "2026-05", balance: { USD: "1234.50" } }], {
        date: "2026-05",
        series: "USD",
        value: 1234.5,
      }),
    ).toContain("+1,234.5");
  });
});
