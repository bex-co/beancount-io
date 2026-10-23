import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EChartsOption } from "echarts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LineChart } from "../line-chart";

/**
 * The plotted points are doubles; the text the reader gets is the ledger's own
 * decimal (w4/1001). The real number formatter runs.
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

beforeEach(() => {
  captured.length = 0;
});

function tooltipText(date: string, unit: string, value: number) {
  const tooltip = captured.at(-1)!.tooltip as {
    formatter: (params: unknown[]) => string;
  };
  return tooltip
    .formatter([
      { name: date, seriesName: unit, color: "#000", value: [date, value] },
    ])
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

async function periodRows() {
  await userEvent
    .setup()
    .click(screen.getByText("page.accountReport.periodData"));
  return within(screen.getByRole("table"))
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.textContent);
}

const render2 = (
  data: Array<{ date: string; balance: Record<string, string> }>,
  inverted = false,
) =>
  render(
    <>
      <h2 id="title">Net Worth</h2>
      <LineChart
        data={data}
        interval="monthly"
        primarySeries="TOK"
        inverted={inverted}
        labelledBy="title"
      />
    </>,
  );

describe("LineChart exact quantities", () => {
  const large = [
    { date: "2016-01-31", balance: { TOK: "9007199254740993.125" } },
    { date: "2016-02-29", balance: { TOK: "9007199254740993.250" } },
  ];

  it("keeps quantities a double cannot hold in Period data and the tooltip", async () => {
    render2(large);
    // The chart itself plots doubles, both now …994.
    const plotted = (
      captured.at(-1)!.series as Array<{ data: [string, number][] }>
    )[0]!.data.map(([, value]) => value);
    expect(plotted[0]).toBe(plotted[1]);

    expect(await periodRows()).toEqual([
      "2016-01-319007199254740993.125 TOK",
      "2016-02-299007199254740993.250 TOK",
    ]);
    expect(tooltipText("2016-01-31", "TOK", plotted[0]!)).toContain(
      "TOK: 9,007,199,254,740,993.125",
    );
    expect(tooltipText("2016-02-29", "TOK", plotted[1]!)).toContain(
      "TOK: 9,007,199,254,740,993.25",
    );
  });

  it("negates the exact quantity for an inverted chart", async () => {
    render2(large, true);
    expect(await periodRows()).toEqual([
      "2016-01-31-9007199254740993.125 TOK",
      "2016-02-29-9007199254740993.250 TOK",
    ]);
    expect(tooltipText("2016-01-31", "TOK", -1)).toContain(
      "TOK: -9,007,199,254,740,993.125",
    );
  });

  it("keeps a tiny quantity nonzero in the tooltip", () => {
    render(
      <LineChart
        data={[
          {
            date: "2016-01-31",
            balance: { NEAR: "0.000000000000000000000001" },
          },
        ]}
        interval="monthly"
        primarySeries="NEAR"
      />,
    );
    expect(tooltipText("2016-01-31", "NEAR", 1e-24)).toContain(
      "NEAR: 0.000000000000000000000001",
    );
  });

  it("keeps ordinary, zero and negative quantities as before", async () => {
    render2([
      { date: "2016-01-31", balance: { TOK: "4.00995", ETH: "-0.125" } },
      { date: "2016-02-29", balance: { TOK: "0" } },
    ]);
    expect(await periodRows()).toEqual([
      "2016-01-314.00995 TOK-0.125 ETH",
      // An absent unit is the chart's plotted zero.
      "2016-02-290 TOK0 ETH",
    ]);
    expect(tooltipText("2016-01-31", "TOK", 4.00995)).toContain("TOK: 4.00995");
  });
});
