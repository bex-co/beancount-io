import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { EChartsOption, LineSeriesOption } from "echarts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FormattedAmounts } from "../formatted-amounts";
import { NetWorthCard } from "../net-worth-card";
import { getBalanceAmounts } from "../../lib/overview-utils";
import { describeNetWorthValuation } from "../../lib/net-worth-valuation";

/**
 * Overview amounts read as the ledger recorded them (w4/1015): a commodity
 * keeps its source digits (4.00995 ETH, not 4.01; 0.0001 BTC, not 0) and the
 * Net Worth card's tooltip, holdings and valuation line use exact decimals.
 * The real number formatter runs.
 */
const captured: EChartsOption[] = [];
vi.mock("@/common/components/react-echarts", () => ({
  ReactECharts: ({ option }: { option: EChartsOption }) => {
    captured.push(option);
    return <div data-testid="chart" />;
  },
}));
vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerData: { options: { renderCommas: true } } }),
}));
vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key} ${JSON.stringify(params)}` : key,
    i18n: { language: "en" },
  }),
}));
vi.mock("@tanstack/react-router", async () => {
  const { useHydrated } = await vi.importActual<
    typeof import("@tanstack/react-router")
  >("@tanstack/react-router");
  return {
    useHydrated,
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
    useNavigate: () => vi.fn(),
    useSearch: () => ({}),
  };
});

beforeEach(() => {
  captured.length = 0;
});

describe("FormattedAmounts keeps commodity source digits", () => {
  it("shows every recorded digit of a commodity, and ISO minor units", () => {
    render(
      <FormattedAmounts
        amounts={getBalanceAmounts({
          ETH: "4.00995",
          BTC: "0.0001",
          USD: "1234.5",
        })}
      />,
    );
    expect(screen.getByText("4.00995 ETH")).toBeInTheDocument();
    expect(screen.getByText("0.0001 BTC")).toBeInTheDocument();
    expect(screen.getByText("1,234.50 USD")).toBeInTheDocument();
  });
});

describe("NetWorthCard exact text", () => {
  const renderCard = (
    data: Array<{ date: string; balance: Record<string, unknown> }>,
    primaryCurrency: string,
    valuation: Parameters<typeof NetWorthCard>[0]["valuation"] = null,
  ) =>
    render(
      <NetWorthCard
        ledgerOwner="owner"
        ledgerName="book"
        valuation={valuation}
        data={data}
        primaryCurrency={primaryCurrency}
      />,
    );

  it("keeps a commodity's digits in the change and the tooltip", () => {
    renderCard(
      [
        { date: "2016-01-31", balance: { ETH: "1.5" } },
        { date: "2016-02-29", balance: { ETH: "4.00995" } },
      ],
      "ETH",
    );
    expect(
      screen.getByText("page.overview.fromPreviousMonth").parentElement!
        .textContent,
    ).toContain("+2.50995 ETH");
    const [eth] = captured.at(-1)!.series as LineSeriesOption[] as Array<{
      tooltip: { valueFormatter: (value: number, index: number) => string };
    }>;
    expect(eth!.tooltip.valueFormatter(4.00995, 1)).toBe("4.00995");
  });

  it("shows a balance a double cannot hold exactly in the tooltip", () => {
    renderCard(
      [
        { date: "2016-01-31", balance: { USD: "9007199254740992" } },
        { date: "2016-02-29", balance: { USD: "9007199254740993" } },
      ],
      "USD",
    );
    const [usd] = captured.at(-1)!.series as LineSeriesOption[] as Array<{
      tooltip: { valueFormatter: (value: number, index: number) => string };
    }>;
    expect(usd!.tooltip.valueFormatter(9007199254740992, 1)).toBe(
      "9,007,199,254,740,993.00",
    );
  });

  it("states an exact unrealized gain and the units the ledger recorded", async () => {
    const valuation = describeNetWorthValuation({
      market: { USD: "9007199254740993" },
      cost: { USD: "9007199254740992" },
      units: { USD: "1", BTC: "0.00000001234567890123" },
      currency: "USD",
      date: "2016-02-29",
      today: "2016-03-01",
      pricePairs: [
        { base: "BTC", quote: "USD", prices: [{ date: "2016-02-29" }] },
      ],
      managedSources: [],
    });
    renderCard(
      [{ date: "2016-02-29", balance: { USD: "9007199254740993" } }],
      "USD",
      valuation,
    );

    // As doubles the gain is 0, and the line was hidden.
    const line = screen.getByText(/page\.overview\.costBasis/).textContent;
    expect(line).toContain("9,007,199,254,740,992.00 USD");
    expect(line).toContain("+1.00 USD");

    await userEvent.click(
      screen.getByRole("button", { name: /page\.overview\.valuedAtMarket/ }),
    );
    expect(
      await screen.findByText("0.00000001234567890123 BTC"),
    ).toBeInTheDocument();
  });
});
