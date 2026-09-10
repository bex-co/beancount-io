import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CommodityPriceHistory } from "../commodity-price-history";
import type { CommodityPairWithPrices } from "@/graphql/definitions";

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string, params?: Record<string, string>) => {
      if (key === "page.commodities.showPriceHistory") {
        return `Show price history for ${params?.pair}`;
      }
      if (key === "page.commodities.hidePriceHistory") {
        return `Hide price history for ${params?.pair}`;
      }
      if (key === "page.commodities.priceHistoryDate") return "Date";
      if (key === "page.commodities.priceHistoryPrice") {
        return `Price (${params?.quote})`;
      }
      return key;
    },
  }),
}));

const btcUsd: CommodityPairWithPrices = {
  __typename: "CommodityPairWithPrices",
  base: "BTC",
  quote: "USD",
  prices: [
    { __typename: "PricePoint", date: "2024-12-31", value: "93500.00" },
    { __typename: "PricePoint", date: "2025-02-01", value: "98000.00" },
  ],
};

const cusdc: CommodityPairWithPrices = {
  __typename: "CommodityPairWithPrices",
  base: "CUSDC",
  quote: "USD",
  prices: [
    { __typename: "PricePoint", date: "2025-01-01", value: "0.0225" },
    { __typename: "PricePoint", date: "2025-01-02", value: "0.0227" },
    { __typename: "PricePoint", date: "2025-01-03", value: "0.0230" },
  ],
};

describe("CommodityPriceHistory", () => {
  it("lets keyboard users open dated prices for a pair", async () => {
    const user = userEvent.setup();
    render(<CommodityPriceHistory commodity={btcUsd} />);

    const toggle = screen.getByRole("button", {
      name: "Show price history for BTC/USD",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("2024-12-31")).toBeInTheDocument();
    expect(screen.getByText("93500.00")).toBeInTheDocument();
    expect(screen.getByText("2025-02-01")).toBeInTheDocument();
    expect(screen.getByText("98000.00")).toBeInTheDocument();

    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("button", {
        name: "Show price history for BTC/USD",
      }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("93500.00")).not.toBeInTheDocument();
  });

  it("keeps distinct low-price decimals for CUSDC", async () => {
    const user = userEvent.setup();
    render(<CommodityPriceHistory commodity={cusdc} />);
    await user.click(
      screen.getByRole("button", {
        name: "Show price history for CUSDC/USD",
      }),
    );
    expect(screen.getByText("0.0225")).toBeInTheDocument();
    expect(screen.getByText("0.0227")).toBeInTheDocument();
    expect(screen.getByText("0.0230")).toBeInTheDocument();
  });
});
