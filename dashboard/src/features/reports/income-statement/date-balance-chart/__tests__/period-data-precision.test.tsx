import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EChartsOption } from "echarts";
import { describe, expect, it, vi } from "vitest";
import { SingleDateBalanceChart } from "../single-date-balance-chart";
import { StackDateBalanceChart } from "../stack-date-balance-chart";

const captured = vi.hoisted(() => vi.fn());
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: EChartsOption }) => {
    captured(option);
    return null;
  },
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { renderCommas: true } } }),
}));

const account = "Income:Investments:Example";
const data = [
  { date: "2026-05-31", balance: { USD: "-2970.10", IRAUSD: "2400.00" } },
  { date: "2026-06-30", balance: { USD: "9007199254740993.125" } },
  { date: "2026-07-31", balance: { USD: "-2019.60" } },
].map((item) => ({ ...item, accountBalances: { [account]: item.balance } }));

describe.each([
  { name: "single bars", Chart: SingleDateBalanceChart },
  { name: "stacked bars", Chart: StackDateBalanceChart },
])("Period data for $name", ({ Chart }) => {
  it.each([
    [
      false,
      ["-2,970.10 USD", "9,007,199,254,740,993.125 USD", "-2,019.60 USD"],
      "2,400.00 IRAUSD",
    ],
    [
      true,
      ["2,970.10 USD", "-9,007,199,254,740,993.125 USD", "2,019.60 USD"],
      "-2,400.00 IRAUSD",
    ],
  ] as const)(
    "preserves the source decimals with inversion %s",
    async (inverted, usd, ira) => {
      render(
        <>
          <h2 id="chart-title">Income Statement</h2>
          <Chart data={data} inverted={inverted} labelledBy="chart-title" />
        </>,
      );
      await userEvent
        .setup()
        .click(screen.getByText("Period data", { selector: "summary" }));
      const table = screen.getByRole("table", {
        name: "Income Statement Period data",
      });
      const rows = within(table).getAllByRole("row").slice(1);
      expect(
        rows.map((row) =>
          [...row.querySelectorAll("bdi")].map((amount) => amount.textContent),
        ),
      ).toEqual([
        [usd[0], ira],
        [usd[1], "0 IRAUSD"],
        [usd[2], "0 IRAUSD"],
      ]);
      const option = captured.mock.lastCall?.[0] as {
        series: { data: number[] }[];
      };
      expect(option.series[0].data[1]).toBe(
        (inverted ? -1 : 1) * Number("9007199254740993.125"),
      );
      if (Chart === StackDateBalanceChart)
        expect(rows[0]).toHaveTextContent(account);
    },
  );
});
