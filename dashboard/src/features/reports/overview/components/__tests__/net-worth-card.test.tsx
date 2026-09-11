import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NetWorthCard } from "../net-worth-card";

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (v: number) => String(v),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
  }),
}));

vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: unknown }) => (
    <span data-testid="echarts-option">{JSON.stringify(option)}</span>
  ),
}));

function seriesNamesOf(): string[] {
  const option = JSON.parse(
    screen.getByTestId("echarts-option").textContent ?? "{}",
  ) as { series: Array<{ name: string }> };
  return option.series.map((series) => series.name);
}

describe("NetWorthCard", () => {
  const data = [
    { date: "2026-06-30", balance: { USD: "1000" } },
    { date: "2026-07-31", balance: { USD: "1200", TRX: "19.953" } },
  ];

  it("shows one headline and a muted residual line under a currency conversion", () => {
    render(<NetWorthCard data={data} primaryCurrency="USD" conversion="USD" />);

    expect(screen.getByText("1200 USD")).toBeInTheDocument();
    expect(
      screen.getByText("page.overview.notConvertedUnits", { exact: false }),
    ).toHaveTextContent("19.953 TRX");
  });

  it("keeps the multi-line list when not converting to a single currency", () => {
    render(
      <NetWorthCard data={data} primaryCurrency="USD" conversion="at_cost" />,
    );

    expect(screen.getByText("1200 USD")).toBeInTheDocument();
    expect(screen.getByText("19.953 TRX")).toBeInTheDocument();
    expect(
      screen.queryByText("page.overview.notConvertedUnits", { exact: false }),
    ).not.toBeInTheDocument();
  });

  it("plots the presentation-currency series, not the ledger's primary currency", () => {
    render(<NetWorthCard data={data} primaryCurrency="USD" conversion="TRX" />);

    expect(seriesNamesOf()).toEqual(["TRX"]);
  });
});
